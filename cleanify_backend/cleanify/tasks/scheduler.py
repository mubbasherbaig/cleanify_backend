"""
Turns user “collect N times per day” into APScheduler jobs.
Keeps track of job ids so they can be updated / removed when user changes settings.
"""
from .extensions import scheduler
from datetime import datetime, timedelta

def schedule_collection(times_per_day: int, working_hours: tuple[int,int]):
    scheduler.remove_all_jobs(jobstore="collections")   # reset
    first, last = working_hours
    interval = (last - first) / times_per_day
    for i in range(times_per_day):
        hour = int(first + i*interval)
        scheduler.add_job(
            func=_trigger_reoptimize,
            trigger="cron",
            hour=hour,
            id=f"collect_{i}",
            jobstore="collections",
        )

def _trigger_reoptimize():
    from cleanify import simulation_service
    simulation_service.optimization_svc.full_reoptimize(
        simulation_service.trucks,
        bins=None,      # let service pull current bins itself
    )
