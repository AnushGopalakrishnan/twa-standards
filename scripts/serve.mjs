import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
export function createServer(){return http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root)){res.writeHead(403);res.end();return;}
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404,{'content-type':'text/html'});res.end(fs.readFileSync(path.join(root,'404.html')));return;}
 const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'};
 res.setHeader('content-type',types[path.extname(file)]||'application/octet-stream');res.setHeader('cache-control','no-store');res.end(fs.readFileSync(file));
});}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const server=createServer().listen(3005,'127.0.0.1',()=>console.log('Standards preview: http://127.0.0.1:3005 (expires after one hour)'));
 setTimeout(()=>server.close(),60*60*1000).unref();
}
