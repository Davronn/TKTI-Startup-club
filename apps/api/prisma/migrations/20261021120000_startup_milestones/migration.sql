CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED');
CREATE TYPE "MilestonePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TABLE "startup_milestones" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "startup_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "priority" "MilestonePriority" NOT NULL DEFAULT 'MEDIUM',
    "due_date" DATE,
    "completed_at" TIMESTAMP(3),
    "assignee_id" UUID,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "startup_milestones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "startup_milestones_organization_id_startup_id_status_idx" ON "startup_milestones"("organization_id", "startup_id", "status");
CREATE INDEX "startup_milestones_startup_id_due_date_idx" ON "startup_milestones"("startup_id", "due_date");
CREATE INDEX "startup_milestones_assignee_id_status_idx" ON "startup_milestones"("assignee_id", "status");

ALTER TABLE "startup_milestones" ADD CONSTRAINT "startup_milestones_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "startup_milestones" ADD CONSTRAINT "startup_milestones_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "startup_milestones" ADD CONSTRAINT "startup_milestones_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "startup_milestones" ADD CONSTRAINT "startup_milestones_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "startup_milestones" ADD CONSTRAINT "startup_milestones_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
