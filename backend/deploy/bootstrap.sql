-- Initialize a new, empty CEMTN database. Run once through Supabase SQL.

BEGIN;

CREATE TABLE public."comment" (
  "authorId" int4 NOT NULL,
  "conteudo" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "id" serial NOT NULL,
  "postId" int4 NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE public."community" (
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "creatorId" int4 NOT NULL,
  "descricao" text NOT NULL,
  "id" serial NOT NULL,
  "nome" text NOT NULL,
  "regras" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE public."communityPost" (
  "authorId" int4 NOT NULL,
  "communityId" int4 NOT NULL,
  "conteudo" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "id" serial NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE public."loginAttempt" (
  "count" int4 NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "key" text NOT NULL,
  PRIMARY KEY ("key")
);

CREATE TABLE public."membership" (
  "communityId" int4 NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "id" serial NOT NULL,
  "userId" int4 NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("communityId", "userId")
);

CREATE TABLE public."news" (
  "authorId" int4 NOT NULL,
  "capa" text,
  "categoria" text NOT NULL,
  "conteudo" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "id" serial NOT NULL,
  "titulo" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE public."passwordReset" (
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "expiresAt" timestamptz NOT NULL,
  "tokenHash" text NOT NULL,
  "userId" int4 NOT NULL,
  PRIMARY KEY ("tokenHash")
);

CREATE TABLE public."role" (
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "id" serial NOT NULL,
  "name" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("name"),
  CONSTRAINT "role_name_check_e46bd907" CHECK ("name" IN ('ALUNO', 'PROFESSOR', 'SOE', 'COORDENACAO', 'DIRECAO'))
);

CREATE TABLE public."session" (
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "expiresAt" timestamptz NOT NULL,
  "tokenHash" text NOT NULL,
  "userId" int4 NOT NULL,
  PRIMARY KEY ("tokenHash")
);

CREATE TABLE public."user" (
  "ativo" bool NOT NULL DEFAULT true,
  "cpf" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "email" text,
  "id" serial NOT NULL,
  "nome" text NOT NULL,
  "roleId" int4 NOT NULL,
  "senhaHash" text NOT NULL,
  "statusCadastro" text NOT NULL DEFAULT 'ATIVO',
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("email"),
  UNIQUE ("cpf")
);

ALTER TABLE public."comment" ADD FOREIGN KEY ("postId") REFERENCES public."communityPost" ("id");

ALTER TABLE public."comment" ADD FOREIGN KEY ("authorId") REFERENCES public."user" ("id");

CREATE INDEX "comment_authorId_idx_e47547ed" ON public."comment" ("authorId");

CREATE INDEX "comment_postId_idx_a7a72715" ON public."comment" ("postId");

ALTER TABLE public."comment" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public."comment" FROM anon, authenticated;

ALTER TABLE public."community" ADD FOREIGN KEY ("creatorId") REFERENCES public."user" ("id");

CREATE INDEX "community_creatorId_idx_3a77d800" ON public."community" ("creatorId");

ALTER TABLE public."community" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public."community" FROM anon, authenticated;

ALTER TABLE public."communityPost" ADD FOREIGN KEY ("communityId") REFERENCES public."community" ("id");

ALTER TABLE public."communityPost" ADD FOREIGN KEY ("authorId") REFERENCES public."user" ("id");

CREATE INDEX "communityPost_authorId_idx_e47547ed" ON public."communityPost" ("authorId");

CREATE INDEX "communityPost_communityId_idx_e2c72225" ON public."communityPost" ("communityId");

ALTER TABLE public."communityPost" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public."communityPost" FROM anon, authenticated;

ALTER TABLE public."loginAttempt" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public."loginAttempt" FROM anon, authenticated;

ALTER TABLE public."membership" ADD FOREIGN KEY ("communityId") REFERENCES public."community" ("id");

ALTER TABLE public."membership" ADD FOREIGN KEY ("userId") REFERENCES public."user" ("id");

CREATE INDEX "membership_communityId_idx_e2c72225" ON public."membership" ("communityId");

CREATE INDEX "membership_userId_idx_a489d58a" ON public."membership" ("userId");

ALTER TABLE public."membership" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public."membership" FROM anon, authenticated;

ALTER TABLE public."news" ADD FOREIGN KEY ("authorId") REFERENCES public."user" ("id");

CREATE INDEX "news_authorId_idx_e47547ed" ON public."news" ("authorId");

ALTER TABLE public."news" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public."news" FROM anon, authenticated;

ALTER TABLE public."passwordReset" ADD FOREIGN KEY ("userId") REFERENCES public."user" ("id");

CREATE INDEX "passwordReset_userId_idx_a489d58a" ON public."passwordReset" ("userId");

ALTER TABLE public."passwordReset" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public."passwordReset" FROM anon, authenticated;

ALTER TABLE public."role" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public."role" FROM anon, authenticated;

ALTER TABLE public."session" ADD FOREIGN KEY ("userId") REFERENCES public."user" ("id");

CREATE INDEX "session_userId_idx_a489d58a" ON public."session" ("userId");

ALTER TABLE public."session" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public."session" FROM anon, authenticated;

ALTER TABLE public."user" ADD FOREIGN KEY ("roleId") REFERENCES public."role" ("id");

CREATE INDEX "user_roleId_idx_ffccc9a4" ON public."user" ("roleId");

ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public."user" FROM anon, authenticated;

ALTER TABLE public."user" ADD CONSTRAINT user_status_cadastro_check CHECK ("statusCadastro" IN ('PENDENTE','ATIVO','RECUSADO','DESATIVADO'));

INSERT INTO public.role (name, "updatedAt") VALUES ('ALUNO',now()),('PROFESSOR',now()),('SOE',now()),('COORDENACAO',now()),('DIRECAO',now());

COMMIT;
