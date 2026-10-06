import { useEffect, useRef, useState } from 'react'
import { getUserPhoto } from '../api/users'

export default function ManagedUserPhoto({id,name,hasPhoto,token,version}:{id:number;name:string;hasPhoto:boolean;token:string;version:string}) {
  const anchor=useRef<HTMLSpanElement>(null)
  const dialog=useRef<HTMLDialogElement>(null)
  const [photo,setPhoto]=useState<{foto:string|null;original:string|null}|null>(null)
  const [error,setError]=useState(false)
  useEffect(()=>{
    if(!hasPhoto || !anchor.current)return
    const controller=new AbortController()
    const observer=new IntersectionObserver(entries=>{
      if(!entries.some(entry=>entry.isIntersecting))return
      observer.disconnect()
      getUserPhoto(id,token,controller.signal).then(setPhoto).catch(()=>{if(!controller.signal.aborted)setError(true)})
    },{rootMargin:'100px'})
    observer.observe(anchor.current)
    return ()=>{observer.disconnect();controller.abort()}
  },[id,token,hasPhoto,version])
  const initials=name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()
  return <span ref={anchor} className="managed-user-photo">
    {photo?.foto ? <button type="button" aria-label={`Ver foto de ${name}`} onClick={()=>dialog.current?.showModal()}><img src={photo.foto} alt=""/></button> : <span title={error?'Não foi possível carregar a foto':undefined}>{initials}</span>}
    <dialog ref={dialog} className="profile-photo-viewer" aria-label={`Foto de ${name}`} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close()}}>
      <form method="dialog"><button>Fechar ×</button></form>
      {photo ? <img src={photo.original || photo.foto || ''} alt={`Foto completa de ${name}`}/> : null}
    </dialog>
  </span>
}
