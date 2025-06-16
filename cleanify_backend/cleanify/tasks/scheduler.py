"""
Turns user "collect N times per day" into APScheduler jobs.
Keeps track of job ids so they can be updated / removed when user changes settings.
"""
from cleanify.extensions import scheduler
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


def schedule_collection(times_per_day: int, working_hours: tuple[int, int]):
    """
    Schedule collection jobs based on user preferences.
    
    Args:
        times_per_day: Number of collection runs per day
        working_hours: Tuple of (start_hour, end_hour) for collections
    """
    try:
        # Clear existing collection jobs
        scheduler.remove_all_jobs(jobstore="collections")
        logger.info("Cleared existing collection jobs")
        
        if times_per_day <= 0:
            logger.warning("Invalid times_per_day, no jobs scheduled")
            return
        
        first, last = working_hours
        
        if first >= last:
            logger.error(f"Invalid working hours: {working_hours}")
            return
        
        # Calculate interval between collections
        working_duration = last - first
        interval = working_duration / times_per_day
        
        scheduled_jobs = []
        
        for i in range(times_per_day):
            # Calculate the hour for this collection
            collection_hour = first + (i * interval)
            hour = int(collection_hour)
            minute = int((collection_hour - hour) * 60)
            
            # Ensure hour is within valid range
            if hour >= 24:
                hour = 23
                minute = 59
            
            job_id = f"collect_{i}"
            
            scheduler.add_job(
                func=_trigger_reoptimize,
                trigger="cron",
                hour=hour,
                minute=minute,
                id=job_id,
                jobstore="collections",
                name=f"Collection Run {i+1}",
                max_instances=1,
                coalesce=True
            )
            
            scheduled_jobs.append({
                "job_id": job_id,
                "hour": hour,
                "minute": minute,
                "time": f"{hour:02d}:{minute:02d}"
            })
            
            logger.info(f"Scheduled collection job {job_id} at {hour:02d}:{minute:02d}")
        
        logger.info(f"Successfully scheduled {len(scheduled_jobs)} collection jobs")
        return scheduled_jobs
        
    except Exception as e:
        logger.error(f"Failed to schedule collections: {e}")
        raise


def _trigger_reoptimize():
    """
    Trigger optimization for all trucks and bins that need collection.
    This function is called by the scheduler at specified times.
    """
    try:
        logger.info("Scheduled collection optimization triggered")
        
        # Import here to avoid circular imports
        from cleanify import simulation_service
        
        if not simulation_service:
            logger.error("Simulation service not available")
            return
        
        # Get bins that need collection
        bins_needing_collection = []
        for bin_obj in simulation_service.bins:
            if bin_obj.status.value == "active":
                threshold = simulation_service.threshold_service.threshold_for(bin_obj)
                if bin_obj.fill_level >= threshold:
                    bins_needing_collection.append(bin_obj)
        
        if not bins_needing_collection:
            logger.info("No bins need collection at this time")
            return
        
        # Trigger full reoptimization
        result = simulation_service.optimization_svc.full_reoptimize(
            simulation_service.trucks,
            bins=bins_needing_collection
        )
        
        if result.get("success", False):
            logger.info(f"Scheduled optimization completed successfully: "
                       f"{result.get('bins_assigned', 0)} bins assigned to "
                       f"{result.get('trucks_used', 0)} trucks")
        else:
            logger.warning(f"Scheduled optimization failed: {result.get('error', 'Unknown error')}")
        
        # Log the event
        simulation_service._log_event("scheduled_optimization", {
            "timestamp": datetime.now().isoformat(),
            "bins_considered": len(bins_needing_collection),
            "result": result
        })
        
    except Exception as e:
        logger.error(f"Scheduled optimization failed: {e}")


def get_scheduled_jobs():
    """Get list of currently scheduled collection jobs"""
    try:
        jobs = scheduler.get_jobs(jobstore="collections")
        
        job_list = []
        for job in jobs:
            # Extract cron trigger information
            trigger_info = {}
            if hasattr(job.trigger, 'fields'):
                trigger_info = {
                    'hour': str(job.trigger.fields[1]),  # hour field
                    'minute': str(job.trigger.fields[2])  # minute field
                }
            
            job_info = {
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": trigger_info,
                "func_name": job.func.__name__ if job.func else None
            }
            job_list.append(job_info)
        
        return job_list
        
    except Exception as e:
        logger.error(f"Failed to get scheduled jobs: {e}")
        return []


def clear_all_collection_jobs():
    """Clear all collection jobs"""
    try:
        jobs_before = len(scheduler.get_jobs(jobstore="collections"))
        scheduler.remove_all_jobs(jobstore="collections")
        logger.info(f"Cleared {jobs_before} collection jobs")
        return jobs_before
        
    except Exception as e:
        logger.error(f"Failed to clear collection jobs: {e}")
        return 0


def pause_scheduled_collections():
    """Pause all scheduled collection jobs"""
    try:
        jobs = scheduler.get_jobs(jobstore="collections")
        paused_count = 0
        
        for job in jobs:
            scheduler.pause_job(job.id, jobstore="collections")
            paused_count += 1
        
        logger.info(f"Paused {paused_count} collection jobs")
        return paused_count
        
    except Exception as e:
        logger.error(f"Failed to pause collection jobs: {e}")
        return 0


def resume_scheduled_collections():
    """Resume all paused collection jobs"""
    try:
        jobs = scheduler.get_jobs(jobstore="collections")
        resumed_count = 0
        
        for job in jobs:
            scheduler.resume_job(job.id, jobstore="collections")
            resumed_count += 1
        
        logger.info(f"Resumed {resumed_count} collection jobs")
        return resumed_count
        
    except Exception as e:
        logger.error(f"Failed to resume collection jobs: {e}")
        return 0


def schedule_one_time_collection(delay_minutes: int = 0):
    """
    Schedule a one-time collection optimization.
    
    Args:
        delay_minutes: Minutes to wait before triggering optimization
    """
    try:
        run_time = datetime.now() + timedelta(minutes=delay_minutes)
        
        job = scheduler.add_job(
            func=_trigger_reoptimize,
            trigger="date",
            run_date=run_time,
            id=f"onetime_collect_{int(run_time.timestamp())}",
            jobstore="collections",
            name="One-time Collection",
            max_instances=1
        )
        
        logger.info(f"Scheduled one-time collection for {run_time.isoformat()}")
        
        return {
            "job_id": job.id,
            "scheduled_time": run_time.isoformat(),
            "delay_minutes": delay_minutes
        }
        
    except Exception as e:
        logger.error(f"Failed to schedule one-time collection: {e}")
        raise


def schedule_daily_reset():
    """Schedule daily reset jobs (reset statistics, bin fill levels, etc.)"""
    try:
        # Schedule daily reset at midnight
        scheduler.add_job(
            func=_daily_reset,
            trigger="cron",
            hour=0,
            minute=0,
            id="daily_reset",
            jobstore="maintenance",
            name="Daily Reset",
            max_instances=1,
            coalesce=True
        )
        
        logger.info("Scheduled daily reset job")
        
    except Exception as e:
        logger.error(f"Failed to schedule daily reset: {e}")


def _daily_reset():
    """Perform daily reset operations"""
    try:
        logger.info("Daily reset triggered")
        
        from cleanify import simulation_service
        
        if not simulation_service:
            logger.error("Simulation service not available for daily reset")
            return
        
        # Reset daily statistics for trucks
        for truck in simulation_service.trucks:
            truck.collections_today = 0
        
        # Reset daily statistics for depots
        for depot in simulation_service.depots:
            depot.reset_daily_stats()
        
        # Log the reset event
        simulation_service._log_event("daily_reset", {
            "timestamp": datetime.now().isoformat(),
            "trucks_reset": len(simulation_service.trucks),
            "depots_reset": len(simulation_service.depots)
        })
        
        logger.info("Daily reset completed successfully")
        
    except Exception as e:
        logger.error(f"Daily reset failed: {e}")


def schedule_maintenance_checks():
    """Schedule periodic maintenance checks for trucks"""
    try:
        # Schedule maintenance checks every 4 hours
        scheduler.add_job(
            func=_maintenance_check,
            trigger="cron",
            hour="*/4",  # Every 4 hours
            id="maintenance_check",
            jobstore="maintenance",
            name="Maintenance Check",
            max_instances=1,
            coalesce=True
        )
        
        logger.info("Scheduled maintenance check job")
        
    except Exception as e:
        logger.error(f"Failed to schedule maintenance checks: {e}")


def _maintenance_check():
    """Check if any trucks need maintenance and log warnings"""
    try:
        logger.info("Maintenance check triggered")
        
        from cleanify import simulation_service
        
        if not simulation_service:
            logger.error("Simulation service not available for maintenance check")
            return
        
        trucks_needing_maintenance = []
        
        for truck in simulation_service.trucks:
            if truck.needs_maintenance() and truck.status.value != "maintenance":
                trucks_needing_maintenance.append(truck.id)
        
        if trucks_needing_maintenance:
            logger.warning(f"Trucks needing maintenance: {trucks_needing_maintenance}")
            
            # Log maintenance event
            simulation_service._log_event("maintenance_check", {
                "timestamp": datetime.now().isoformat(),
                "trucks_needing_maintenance": trucks_needing_maintenance,
                "total_trucks": len(simulation_service.trucks)
            })
        else:
            logger.info("All trucks are in good condition")
        
    except Exception as e:
        logger.error(f"Maintenance check failed: {e}")


def get_scheduler_status():
    """Get comprehensive scheduler status"""
    try:
        status = {
            "scheduler_running": scheduler.running,
            "total_jobs": len(scheduler.get_jobs()),
            "collection_jobs": len(scheduler.get_jobs(jobstore="collections")),
            "maintenance_jobs": len(scheduler.get_jobs(jobstore="maintenance")),
            "scheduled_collections": get_scheduled_jobs(),
            "next_collection": None,
            "uptime": None
        }
        
        # Find next collection time
        collection_jobs = scheduler.get_jobs(jobstore="collections")
        if collection_jobs:
            next_runs = [job.next_run_time for job in collection_jobs if job.next_run_time]
            if next_runs:
                status["next_collection"] = min(next_runs).isoformat()
        
        # Scheduler uptime (if available)
        if hasattr(scheduler, '_start_time'):
            uptime = datetime.now() - scheduler._start_time
            status["uptime"] = str(uptime)
        
        return status
        
    except Exception as e:
        logger.error(f"Failed to get scheduler status: {e}")
        return {"error": str(e)}


def initialize_default_jobs():
    """Initialize default scheduled jobs"""
    try:
        # Schedule default collections (2 times per day, 8-18 hours)
        schedule_collection(2, (8, 18))
        
        # Schedule daily reset
        schedule_daily_reset()
        
        # Schedule maintenance checks
        schedule_maintenance_checks()
        
        logger.info("Default jobs initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize default jobs: {e}")


# Initialize default jobs when module is imported
try:
    # Only initialize if scheduler is running
    if scheduler.running:
        initialize_default_jobs()
except Exception as e:
    logger.warning(f"Could not initialize default jobs: {e}")


def emergency_stop_all_jobs():
    """Emergency function to stop all scheduled jobs"""
    try:
        all_jobs = scheduler.get_jobs()
        job_count = len(all_jobs)
        
        scheduler.remove_all_jobs()
        
        logger.warning(f"Emergency stop: Removed {job_count} jobs")
        return job_count
        
    except Exception as e:
        logger.error(f"Emergency stop failed: {e}")
        return 0