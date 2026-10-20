CREATE TYPE "OrganizationRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER');
CREATE TYPE "StartupStatus" AS ENUM ('ACTIVE', 'PAUSED', 'GRADUATED', 'ARCHIVED');
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'RESTORE', 'LOGIN', 'LOGOUT', 'STAGE_CHANGE');

CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_members" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "startup_stages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748B',
    "position" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "startup_stages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "startups" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "problem" TEXT,
    "solution" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "team_size" INTEGER,
    "founded_at" DATE,
    "joined_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logo_url" TEXT,
    "pitch_deck_url" TEXT,
    "status" "StartupStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_stage_id" UUID NOT NULL,
    "curator_id" UUID,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID NOT NULL,
    "metadata" JSONB,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "startups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "startup_members" (
    "id" UUID NOT NULL,
    "startup_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedin_url" TEXT,
    "is_founder" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "startup_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "startup_stage_history" (
    "id" UUID NOT NULL,
    "startup_id" UUID NOT NULL,
    "from_stage_id" UUID,
    "to_stage_id" UUID NOT NULL,
    "changed_by_id" UUID NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "startup_stage_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "startup_notes" (
    "id" UUID NOT NULL,
    "startup_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "startup_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "startup_files" (
    "id" UUID NOT NULL,
    "startup_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "startup_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748B',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "startup_tags" (
    "startup_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    CONSTRAINT "startup_tags_pkey" PRIMARY KEY ("startup_id", "tag_id")
);

CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "changes" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");
CREATE INDEX "startup_stages_organization_id_is_active_idx" ON "startup_stages"("organization_id", "is_active");
CREATE UNIQUE INDEX "startup_stages_organization_id_slug_key" ON "startup_stages"("organization_id", "slug");
CREATE UNIQUE INDEX "startup_stages_organization_id_position_key" ON "startup_stages"("organization_id", "position");
CREATE INDEX "startups_organization_id_status_idx" ON "startups"("organization_id", "status");
CREATE INDEX "startups_organization_id_current_stage_id_idx" ON "startups"("organization_id", "current_stage_id");
CREATE INDEX "startups_organization_id_curator_id_idx" ON "startups"("organization_id", "curator_id");
CREATE INDEX "startups_organization_id_created_at_idx" ON "startups"("organization_id", "created_at");
CREATE UNIQUE INDEX "startups_organization_id_slug_key" ON "startups"("organization_id", "slug");
CREATE INDEX "startup_members_startup_id_idx" ON "startup_members"("startup_id");
CREATE INDEX "startup_stage_history_startup_id_created_at_idx" ON "startup_stage_history"("startup_id", "created_at");
CREATE INDEX "startup_notes_startup_id_created_at_idx" ON "startup_notes"("startup_id", "created_at");
CREATE UNIQUE INDEX "startup_files_object_key_key" ON "startup_files"("object_key");
CREATE INDEX "startup_files_startup_id_idx" ON "startup_files"("startup_id");
CREATE UNIQUE INDEX "tags_organization_id_name_key" ON "tags"("organization_id", "name");
CREATE INDEX "user_sessions_user_id_expires_at_idx" ON "user_sessions"("user_id", "expires_at");
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "startup_stages" ADD CONSTRAINT "startup_stages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "startups" ADD CONSTRAINT "startups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "startups" ADD CONSTRAINT "startups_current_stage_id_fkey" FOREIGN KEY ("current_stage_id") REFERENCES "startup_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "startups" ADD CONSTRAINT "startups_curator_id_fkey" FOREIGN KEY ("curator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "startups" ADD CONSTRAINT "startups_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "startups" ADD CONSTRAINT "startups_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "startup_members" ADD CONSTRAINT "startup_members_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "startup_stage_history" ADD CONSTRAINT "startup_stage_history_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "startup_stage_history" ADD CONSTRAINT "startup_stage_history_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "startup_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "startup_stage_history" ADD CONSTRAINT "startup_stage_history_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "startup_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "startup_stage_history" ADD CONSTRAINT "startup_stage_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "startup_notes" ADD CONSTRAINT "startup_notes_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "startup_notes" ADD CONSTRAINT "startup_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "startup_files" ADD CONSTRAINT "startup_files_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "startup_files" ADD CONSTRAINT "startup_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tags" ADD CONSTRAINT "tags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "startup_tags" ADD CONSTRAINT "startup_tags_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "startup_tags" ADD CONSTRAINT "startup_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
