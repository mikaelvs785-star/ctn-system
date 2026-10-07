CREATE TABLE IF NOT EXISTS public."notificationRead" (
 "userId" integer NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
 "eventId" text NOT NULL,
 "readAt" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("userId","eventId")
);
ALTER TABLE public."notificationRead" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."notificationRead" FROM anon, authenticated;
