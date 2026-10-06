import { useRef, useState } from "react";
import { prepareNewsCover } from "../utils/news-cover";

interface Props {
  value: string;
  onChange: (cover: string) => void;
  onBusyChange?: (busy: boolean) => void;
}

// Stores the chosen crop itself, so cards and the community banner share it.
export default function CommunityCoverEditor({
  value,
  onChange,
  onBusyChange,
}: Props) {
  const [source, setSource] = useState("");
  const [position, setPosition] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const imageRef = useRef<HTMLImageElement>(null);

  async function select(file?: File) {
    if (!file) return;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      setSource(await prepareNewsCover(file));
      setPosition(50);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível preparar a capa",
      );
      onBusyChange?.(false);
    } finally {
      setBusy(false);
    }
  }

  function applyCrop() {
    const image = imageRef.current;
    if (!image?.naturalWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 600;
    const context = canvas.getContext("2d");
    if (!context) return setError("Não foi possível ajustar a imagem");
    const scale = Math.max(
      canvas.width / image.naturalWidth,
      canvas.height / image.naturalHeight,
    );
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(
      image,
      (canvas.width - width) / 2,
      ((canvas.height - height) * position) / 100,
      width,
      height,
    );
    let cover = canvas.toDataURL("image/jpeg", 0.8);
    if (cover.length > 1_400_000) cover = canvas.toDataURL("image/jpeg", 0.6);
    if (cover.length > 1_400_000)
      return setError("A capa ficou muito grande. Escolha outra imagem.");
    onChange(cover);
    setSource("");
    onBusyChange?.(false);
  }

  return (
    <section className="community-cover-editor">
      <h2>Capa da comunidade</h2>
      <p>
        Escolha uma imagem e ajuste o recorte. A mesma capa aparece na lista e
        na comunidade.
      </p>
      <label>
        Enviar ou trocar imagem
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => {
            void select(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      <small>JPEG, PNG ou WebP · até 8 MB</small>
      {source ? (
        <>
          <div className="cover-crop-preview">
            <img
              ref={imageRef}
              src={source}
              alt="Prévia do recorte"
              style={{ objectPosition: `50% ${position}%` }}
            />
          </div>
          <label>
            Posição vertical
            <input
              type="range"
              min="0"
              max="100"
              value={position}
              onChange={(event) => setPosition(Number(event.target.value))}
            />
          </label>
          <div className="cover-actions">
            <button type="button" onClick={applyCrop}>
              Aplicar recorte
            </button>
            <button
              type="button"
              onClick={() => {
                setSource("");
                onBusyChange?.(false);
              }}
            >
              Cancelar ajuste
            </button>
          </div>
          <small>Aplique o recorte antes de salvar a comunidade.</small>
        </>
      ) : value ? (
        <>
          <img
            className="community-cover-preview"
            src={value}
            alt="Capa selecionada"
          />
          <button type="button" onClick={() => onChange("")}>
            Remover capa
          </button>
        </>
      ) : (
        <p className="cover-placeholder">
          Sem capa · será usado um fundo discreto.
        </p>
      )}
      {busy ? <p role="status">Preparando imagem...</p> : null}
      {error ? (
        <p role="alert" className="profile-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
