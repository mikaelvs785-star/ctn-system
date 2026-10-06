import { useEffect, useRef, useState, type PointerEvent } from 'react'

export interface PhotoCrop { zoom: number; x: number; y: number }
interface Props {
  source: File | string
  crop: PhotoCrop
  onChange: (crop: PhotoCrop) => void
  onSave: () => void
  onCancel: () => void
  busy: boolean
}
const clamp = (value: number) => Math.max(0, Math.min(100, value))

export default function ProfilePhotoEditor({source,crop,onChange,onSave,onCancel,busy}:Props) {
  const [image,setImage] = useState<{url:string;width:number;height:number}|null>(null)
  const drag = useRef<{id:number;clientX:number;clientY:number;crop:PhotoCrop;width:number}|null>(null)
  useEffect(()=>{
    const url=typeof source==='string'?source:URL.createObjectURL(source)
    const img=new Image()
    let active=true
    img.onload=()=>{if(active)setImage({url,width:img.naturalWidth,height:img.naturalHeight})}
    img.src=url
    return ()=>{active=false;if(typeof source!=='string')URL.revokeObjectURL(url)}
  },[source])
  const width=image ? image.width/Math.min(image.width,image.height)*crop.zoom : 1
  const height=image ? image.height/Math.min(image.width,image.height)*crop.zoom : 1
  function move(event:PointerEvent<HTMLDivElement>) {
    const start=drag.current
    if(!start || start.id!==event.pointerId || busy)return
    onChange({...crop,
      x:width>1?clamp(start.crop.x-(event.clientX-start.clientX)/(start.width*(width-1))*100):50,
      y:height>1?clamp(start.crop.y-(event.clientY-start.clientY)/(start.width*(height-1))*100):50,
    })
  }
  return <section className="photo-editor" aria-label="Editor de foto">
    <header><h2>Ajustar foto</h2><p>Arraste a imagem para posicionar seu rosto dentro do círculo.</p></header>
    <div className="photo-editor__stage">
      <div className="photo-editor__viewport" tabIndex={0} role="group" aria-label="Arraste para mover a foto ou use as setas do teclado"
        onPointerDown={event=>{if(busy || !image)return;event.currentTarget.setPointerCapture(event.pointerId);drag.current={id:event.pointerId,clientX:event.clientX,clientY:event.clientY,crop,width:event.currentTarget.getBoundingClientRect().width}}}
        onPointerMove={move} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}
        onKeyDown={event=>{if(busy)return;const delta=event.shiftKey?5:1;const next={...crop};if(event.key==='ArrowLeft')next.x=clamp(crop.x+delta);else if(event.key==='ArrowRight')next.x=clamp(crop.x-delta);else if(event.key==='ArrowUp')next.y=clamp(crop.y+delta);else if(event.key==='ArrowDown')next.y=clamp(crop.y-delta);else return;event.preventDefault();onChange(next)}}>
        {image ? <img draggable={false} src={image.url} alt="Foto para enquadramento" style={{width:`${width*100}%`,height:`${height*100}%`,left:`${-(width-1)*crop.x}%`,top:`${-(height-1)*crop.y}%`}}/> : <span>Carregando foto...</span>}
      </div>
    </div>
    <label className="photo-editor__zoom">Zoom <input type="range" min={1} max={3} step={.01} value={crop.zoom} disabled={busy} onChange={event=>onChange({...crop,zoom:Number(event.target.value)})}/><output>{Math.round(crop.zoom*100)}%</output></label>
    <div className="photo-editor__actions"><button type="button" disabled={busy} onClick={()=>onChange({zoom:1,x:50,y:50})}>Centralizar</button><button type="button" disabled={busy} onClick={onCancel}>Cancelar</button><button className="photo-editor__save" type="button" disabled={busy || !image} onClick={onSave}>{busy?'Salvando…':'Salvar foto'}</button></div>
  </section>
}
