-- CreateTable
CREATE TABLE "public"."LearningPlan" (
    "id" TEXT NOT NULL,
    "skills" TEXT[],
    "difficulty" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "overview" TEXT NOT NULL,
    "roadmap" JSONB NOT NULL,
    "resources" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningPlan_pkey" PRIMARY KEY ("id")
);
