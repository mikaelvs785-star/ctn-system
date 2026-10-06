export async function prepareProfilePhoto(file: File | string, zoom = 1, x = 50, y = 50): Promise<string> {
 if (typeof file !== 'string' && !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Use JPEG, PNG ou WebP.')
 if (typeof file !== 'string' && file.size > 8 * 1024 * 1024) throw new Error('Escolha uma imagem de até 8 MB.')
 const url = typeof file === 'string' ? file : URL.createObjectURL(file)
 try {
  const img = new Image()
  await new Promise<void>((resolve,reject) => { img.onload=()=>resolve(); img.onerror=()=>reject(new Error('Não foi possível ler a foto.')); img.src=url })
  const size=Math.min(img.naturalWidth,img.naturalHeight)/Math.max(1,Math.min(3,zoom))
  const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=512
  const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Não foi possível preparar a foto.')
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,512,512)
  ctx.drawImage(img,(img.naturalWidth-size)*Math.max(0,Math.min(100,x))/100,(img.naturalHeight-size)*Math.max(0,Math.min(100,y))/100,size,size,0,0,512,512)
  const foto=canvas.toDataURL('image/jpeg',.8)
  if(foto.length>400000) throw new Error('Escolha uma foto mais simples.')
  return foto
 } finally { if(typeof file !== 'string') URL.revokeObjectURL(url) }
}
