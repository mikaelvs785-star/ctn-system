import { useState, type FormEvent } from "react";
import { prepareProfilePhoto } from "../utils/profile-photo";
import { changePassword, saveProfilePhoto } from "../api/profile";
import { useAuth } from "../auth/auth-context";
import {
  getThemePreference,
  saveThemePreference,
  type ThemePreference,
} from "../theme/theme";
import "./ProfilePage.css";

const roleLabels: Record<string, string> = {
  ALUNO: "Aluno",
  PROFESSOR: "Professor",
  DIRECAO: "Direção",
  COORDENACAO: "Coordenação",
  SOE: "SOE",
};

export default function ProfilePage() {
  const { user, token, clearSession, updatePhoto } = useAuth();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoNotice, setPhotoNotice] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [preference, setPreference] =
    useState<ThemePreference>(getThemePreference);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");
    if (newPassword.length < 12)
      return setErrorMessage(
        "A nova senha precisa ter pelo menos 12 caracteres",
      );
    if (newPassword !== confirmPassword)
      return setErrorMessage("A confirmação não corresponde à nova senha");
    if (!token || submitting) return;
    setSubmitting(true);
    try {
      await changePassword(token, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordChanged(true);
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : "Não foi possível alterar a senha",
      );
    } finally {
      setSubmitting(false);
    }
  }
  async function savePhoto(foto: string) {
    if (!token || photoBusy) return;
    setPhotoBusy(true); setPhotoError(""); setPhotoNotice("");
    try { const result = await saveProfilePhoto(token, foto); updatePhoto(result.foto); setPreview(null); setPhotoNotice(foto ? "Foto atualizada." : "Foto removida."); }
    catch(e) { setPhotoError(e instanceof Error ? e.message : "Não foi possível salvar a foto."); }
    finally { setPhotoBusy(false); }
  }
  if (!user) return null;
  const fields = [
    {
      id: "current",
      label: "Senha atual",
      value: currentPassword,
      set: setCurrentPassword,
      auto: "current-password",
    },
    {
      id: "new",
      label: "Nova senha",
      value: newPassword,
      set: setNewPassword,
      auto: "new-password",
    },
    {
      id: "confirm",
      label: "Confirmar nova senha",
      value: confirmPassword,
      set: setConfirmPassword,
      auto: "new-password",
    },
  ];
  return (
    <main className="profile-page">
      <header>
        <h1>Meu perfil</h1>
        <p>Gerencie seus dados e a segurança da sua conta.</p>
      </header>
      <section className="profile-identity">
        <div className="profile-avatar">
          {preview || user.foto ? <img src={preview || user.foto || ""} alt="Foto do seu perfil" /> : user.nome
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase()}
        </div>
        <div>
          <h2>{user.nome}</h2>
          <span>{roleLabels[user.role] ?? user.role}</span>
          <p className="profile-active">Conta ativa</p>
        </div>
      </section>
      <section className="profile-photo-controls" aria-label="Foto de perfil">
        <label> {user.foto ? "Trocar foto" : "Adicionar foto"}
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={photoBusy} onChange={async event => {
            const file=event.target.files?.[0]; event.target.value=""; if(!file) return;
            setPhotoError(""); setPhotoNotice(""); setPhotoBusy(true);
            try { setPreview(await prepareProfilePhoto(file)); } catch(e) { setPhotoError(e instanceof Error ? e.message : "Foto inválida."); } finally { setPhotoBusy(false); }
          }} />
        </label>
        {preview ? <><button type="button" disabled={photoBusy} onClick={()=>void savePhoto(preview)}>Salvar foto</button><button type="button" disabled={photoBusy} onClick={()=>setPreview(null)}>Cancelar</button></> : user.foto ? <button type="button" disabled={photoBusy} onClick={()=>void savePhoto("")}>Remover foto</button> : null}
        <small>JPEG, PNG ou WebP, até 8 MB. Recorte quadrado central, com prévia antes de salvar.</small>
        {photoBusy ? <p role="status">Processando foto...</p> : null}
        {photoError ? <p role="alert">{photoError}</p> : null}
        {photoNotice ? <p role="status">{photoNotice}</p> : null}
      </section>
      <div className="profile-layout">
        <section className="profile-card">
          <header>
            <div>
              <h2>Dados da conta</h2>
              <p>Informações do seu cadastro.</p>
            </div>
          </header>
          <dl>
            <div>
              <dt>Nome completo</dt>
              <dd>{user.nome}</dd>
            </div>
            <div>
              <dt>CPF</dt>
              <dd>{user.cpfMascarado || "Não cadastrado"}</dd>
            </div>
            <div>
              <dt>Perfil</dt>
              <dd>{roleLabels[user.role] ?? user.role}</dd>
            </div>
            <div>
              <dt>Situação</dt>
              <dd className="profile-active">Ativo</dd>
            </div>
          </dl>
          <p className="profile-note">
            Para corrigir seus dados, entre em contato com a direção.
          </p>
          <section className="profile-appearance">
            <h2>Aparência</h2>
            <p>Escolha como visualizar o CEMTN.</p>
            <div role="group" aria-label="Aparência">
              {(
                [
                  ["light", "Claro"],
                  ["dark", "Escuro"],
                  ["system", "Sistema"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={preference === value}
                  onClick={() => {
                    setPreference(value);
                    saveThemePreference(value);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        </section>
        <section className="profile-card profile-security">
          <header>
            <div>
              <h2>Segurança</h2>
              <p>Altere sua senha de acesso.</p>
            </div>
          </header>
          {passwordChanged ? (
            <div className="profile-success" role="status">
              <strong>Senha alterada com sucesso</strong>
              <p>Por segurança, suas sessões anteriores foram encerradas.</p>
              <button type="button" onClick={clearSession}>
                Entrar novamente
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {fields.map((field) => (
                <label key={field.id} htmlFor={`password-${field.id}`}>
                  {field.label}
                  <span className="password-field">
                    <input
                      id={`password-${field.id}`}
                      type={visible[field.id] ? "text" : "password"}
                      autoComplete={field.auto}
                      value={field.value}
                      onChange={(event) => field.set(event.target.value)}
                      required
                      minLength={field.id === "current" ? undefined : 12}
                      maxLength={128}
                    />
                    <button
                      type="button"
                      aria-label={`${visible[field.id] ? "Ocultar" : "Mostrar"} ${field.label.toLowerCase()}`}
                      aria-pressed={Boolean(visible[field.id])}
                      onClick={() =>
                        setVisible((current) => ({
                          ...current,
                          [field.id]: !current[field.id],
                        }))
                      }
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </span>
                  {field.id === "new" ? (
                    <small>Mínimo de 12 caracteres.</small>
                  ) : null}
                </label>
              ))}
              {errorMessage ? (
                <p className="profile-error" role="alert">
                  {errorMessage}
                </p>
              ) : null}
              <button type="submit" disabled={submitting}>
                {submitting ? "Alterando..." : "Alterar senha"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
