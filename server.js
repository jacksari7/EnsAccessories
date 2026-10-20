const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=__dirname, data=path.join(root,'data'), pub=path.join(root,'public');
const port=Number(process.env.PORT||3000), adminKey=process.env.ADMIN_KEY||'';
const read=(name)=>JSON.parse(fs.readFileSync(path.join(data,name),'utf8'));
const write=(name,obj)=>{const dest=path.join(data,name),temp=dest+'.tmp';fs.writeFileSync(temp,JSON.stringify(obj,null,2));fs.renameSync(temp,dest)};
const json=(res,code,body)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body))};
const authorized=req=>adminKey.length>=12 && req.headers['x-admin-key']===adminKey;
const receive=req=>new Promise((resolve,reject)=>{let body='';req.on('data',chunk=>{body+=chunk;if(body.length>300000){reject(new Error('İstek çok büyük'));req.destroy()}});req.on('end',()=>{try{resolve(JSON.parse(body||'{}'))}catch{reject(new Error('Geçersiz JSON'))}});req.on('error',reject)});
const safe=(v,n=180)=>String(v??'').trim().slice(0,n);
const validImage=v=>!v||/^https:\/\//i.test(v)||/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(v);
let queue=Promise.resolve();function serialized(fn){const result=queue.then(fn);queue=result.catch(()=>{});return result}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://localhost');const pathname=url.pathname;
 if(pathname==='/api/products'&&req.method==='GET')return json(res,200,read('products.json'));
 if(pathname==='/api/config'&&req.method==='GET')return json(res,200,{cardEnabled:false,adminConfigured:adminKey.length>=12,whatsapp:process.env.STORE_WHATSAPP||'',email:process.env.STORE_EMAIL||''});
 if(pathname==='/api/admin/check'&&req.method==='GET')return json(res,authorized(req)?200:401,{ok:authorized(req)});
 if(pathname==='/api/admin/orders'&&req.method==='GET')return authorized(req)?json(res,200,read('orders.json')):json(res,401,{error:'Yetkisiz'});
 if(pathname==='/api/admin/products'&&req.method==='POST'){
  if(!authorized(req))return json(res,401,{error:'Yetkisiz'});
  const p=await receive(req),name=safe(p.name,90),category=safe(p.category,40),description=safe(p.description,500),price=Number(p.price),stock=Number(p.stock),image=safe(p.image,200000);
  if(!name||!category||!Number.isFinite(price)||price<=0||!Number.isSafeInteger(stock)||stock<0||!validImage(image))return json(res,400,{error:'Ürün bilgilerini kontrol edin.'});
  return json(res,201,await serialized(()=>{const products=read('products.json');const item={id:crypto.randomUUID(),name,category,description,price:Math.round(price*100)/100,stock,image};products.push(item);write('products.json',products);return item}));
 }
 if(pathname.startsWith('/api/admin/products/')&&req.method==='PATCH'){
  if(!authorized(req))return json(res,401,{error:'Yetkisiz'});
  const p=await receive(req);return json(res,200,await serialized(()=>{const products=read('products.json'),item=products.find(x=>x.id===pathname.split('/').pop());if(!item)throw Object.assign(new Error('Ürün bulunamadı'),{status:404});if(p.stock!==undefined){if(!Number.isSafeInteger(Number(p.stock))||Number(p.stock)<0)throw Object.assign(new Error('Stok geçersiz'),{status:400});item.stock=Number(p.stock)}if(p.price!==undefined){if(!Number.isFinite(Number(p.price))||Number(p.price)<=0)throw Object.assign(new Error('Fiyat geçersiz'),{status:400});item.price=Math.round(Number(p.price)*100)/100}write('products.json',products);return item}));
 }
 if(pathname==='/api/orders'&&req.method==='POST'){
  const body=await receive(req),items=Array.isArray(body.items)?body.items:[],customer=body.customer||{};
  const name=safe(customer.name,90),phone=safe(customer.phone,30),address=safe(customer.address,400),note=safe(customer.note,400),method=safe(body.method,30);
  if(!name||!/^\+?[0-9\s()-]{10,20}$/.test(phone)||!address||!['whatsapp','card'].includes(method)||!items.length||items.length>50)return json(res,400,{error:'Sipariş bilgilerini kontrol edin.'});
  if(method==='card')return json(res,501,{error:'Kartla ödeme henüz etkin değil. Ödeme kuruluşu entegrasyonu gerekli.'});
  const order=await serialized(()=>{const products=read('products.json'),lines=[];const counts=new Map();for(const row of items){const id=safe(row.id,80),qty=Number(row.quantity);if(!Number.isSafeInteger(qty)||qty<1||qty>99)throw Object.assign(new Error('Adet geçersiz'),{status:400});counts.set(id,(counts.get(id)||0)+qty)}for(const [id,qty] of counts){const product=products.find(p=>p.id===id);if(!product||product.stock<qty)throw Object.assign(new Error((product?.name||'Ürün')+' için stok yetersiz.'),{status:409});lines.push({id,name:product.name,quantity:qty,unitPrice:product.price});}for(const line of lines){products.find(p=>p.id===line.id).stock-=line.quantity}const orders=read('orders.json'),order={id:'ENS-'+Date.now()+'-'+crypto.randomBytes(2).toString('hex').toUpperCase(),createdAt:new Date().toISOString(),customer:{name,phone,address,note},method,status:'WhatsApp onayı bekliyor',items:lines,total:Math.round(lines.reduce((s,x)=>s+x.quantity*x.unitPrice,0)*100)/100};orders.unshift(order);write('orders.json',orders);write('products.json',products);return order});
  return json(res,201,order);
 }
 if(req.method!=='GET')return json(res,405,{error:'İzin verilmeyen yöntem'});
 const file=path.resolve(pub,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(pub+path.sep))return json(res,403,{error:'Yasak'});
 fs.readFile(file,(err,content)=>{if(err)return json(res,404,{error:'Bulunamadı'});res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' data: https:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'"});res.end(content)});
 }catch(e){json(res,e.status||500,{error:e.status?e.message:'Sunucu hatası: '+e.message})}
}).listen(port,()=>console.log('ENS mağazası: http://localhost:'+port));
