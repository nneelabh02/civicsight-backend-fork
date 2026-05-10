from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from database import get_supabase
from auth import get_current_user, get_optional_user
from models.report import ReportCreate, ReportStatusUpdate, ReportManualClassify
from processor import process_report
from state_machine import transition, InvalidTransitionError
from notifications import send_escalation_alert
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("/", status_code=201)
@limiter.limit("10/minute")
def submit_report(
    request: Request,
    body: ReportCreate,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_optional_user),
):
    supabase = get_supabase()

    report_data = {
        "image_url": body.image_url,
        "citizen_description": body.citizen_description,
        "lat": body.lat,
        "lng": body.lng,
        "address": body.address,
        "status": "submitted",
        "citizen_id": current_user.id if current_user else None,
    }

    result = supabase.table("reports").insert(report_data).execute()
    report = result.data[0]
    report_id = report["id"]

    # Kick off AI processing in background
    background_tasks.add_task(process_report, supabase, report_id)

    return {"id": report_id, "status": "submitted"}


@router.get("/")
def list_reports():
    supabase = get_supabase()
    # HACKATHON BYPASS: Ignore roles, dump all reports for the UI demo
    result = supabase.table("reports").select("*").order("created_at", desc=True).execute()
    return result.data


@router.get("/{report_id}")
def get_report(report_id: str, current_user=Depends(get_optional_user)):
    supabase = get_supabase()
    result = supabase.table("reports").select("*").eq("id", report_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Report not found")
    return result.data


@router.patch("/{report_id}/status")
def update_status(
    report_id: str,
    body: ReportStatusUpdate,
):
    supabase = get_supabase()

    report = supabase.table("reports").select("status").eq("id", report_id).single().execute().data
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    try:
        transition(report["status"], body.new_status)
    except InvalidTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    supabase.table("reports").update({"status": body.new_status}).eq("id", report_id).execute()
    
    # HACKATHON BYPASS: No current_user, so changed_by_user_id is None
    supabase.table("report_status_history").insert({
        "report_id": report_id,
        "old_status": report["status"],
        "new_status": body.new_status,
        "changed_by_user_id": None,
        "note": body.note,
    }).execute()

    if body.new_status == "escalated":
        try:
            admin = supabase.table("users").select("id").eq("role", "admin").limit(1).execute()
            if admin.data:
                send_escalation_alert(
                    admin_email="admin@yourcity.gov",  
                    report_id=report_id,
                    category=report.get("ai_category", "unknown"),
                    reason=body.note,
                )
        except Exception as e:
            print(f"Escalation email failed (non-fatal): {e}")

    return {"id": report_id, "status": body.new_status}


@router.post("/{report_id}/classify")
def manual_classify(
    report_id: str,
    body: ReportManualClassify,
    current_user=Depends(get_current_user),
):
    supabase = get_supabase()

    # Look up department for category
    dept = supabase.table("category_department_map").select("department_id").eq("category", body.category).single().execute()
    if not dept.data:
        raise HTTPException(status_code=400, detail="Unknown category")

    dept_id = dept.data["department_id"]

    supabase.table("reports").update({
        "ai_category": body.category,
        "ai_priority": body.priority,
        "assigned_department_id": dept_id,
        "needs_human_review": False,
        "status": "assigned",
    }).eq("id", report_id).execute()

    supabase.table("report_status_history").insert({
        "report_id": report_id,
        "old_status": "needs_review",
        "new_status": "assigned",
        "changed_by_user_id": current_user.id,
        "note": body.note or "Manually classified by admin",
    }).execute()

    return {"id": report_id, "status": "assigned", "department_id": dept_id}