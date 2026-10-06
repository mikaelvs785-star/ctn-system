export async function prepareProfilePhoto(file: File): Promise<string> {
 if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Use JPEG, PNG ou WebP.')
 if (file.size > 8 * 1024 * 1024) throw new Error('Escolha uma imagem de até 8 MB.')
 const url = URL.createObjectURL(file)
 try {
  const img = new Image()
  await new Promise<void>((resolve,reject) => { img.onload=()=>resolve(); img.onerror=()=>reject(new Error('Não foi possível ler a foto.')); img.src=url })
  const size=Math.min(img.naturalWidth,img.naturalHeight)
  const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=512
  const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Não foi possível preparar a foto.')
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,512,512)
  ctx.drawImage(img,(img.naturalWidth-size)/2,(img.naturalHeight-size)/2,size,size,0,0,512,512)
  const foto=canvas.toDataURL('image/jpeg',.8)
  if(foto.length>400000) throw new Error('Escolha uma foto mais simples.')
  return foto
 } finally { URL.revokeObjectURL(url) }
}
