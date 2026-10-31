// Dependency-free packer for this project's named-import JavaScript modules.
// Imported bindings use getters so vocabulary changes and circular UI imports stay live.
const fs=require('node:fs'),path=require('node:path');
const root=__dirname,source=path.join(root,'source');
function resolve(parent,spec){
    if(/^(?:[a-z]+:|\/|\\)/i.test(spec))throw Error('Only project-relative assets are supported: '+spec);
    const file=path.resolve(path.dirname(parent),spec.split('?')[0]);
    if(!file.startsWith(source+path.sep))throw Error('Import leaves the Dates source folder');
    return file;
}
function bundle(entry){
    const modules=new Map(),id=file=>path.relative(source,file).split(path.sep).join('/');
    function collect(file){
        if(modules.has(file))return;modules.set(file,null);
        let body=fs.readFileSync(file,'utf8');const imports=[],exports=new Map(),deps=[];
        const bindingPairs=names=>names.split(',').map(s=>s.trim()).filter(Boolean).map(s=>s.split(/\s+as\s+/));
        body=body.replace(/\bexport\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]\s*;?/g,(_,names,spec)=>{
            const dep=resolve(file,spec);deps.push(dep);collect(dep);
            for(const [original,alias]of bindingPairs(names))exports.set(alias||original,'__datesRequire('+JSON.stringify(id(dep))+')['+JSON.stringify(original)+']');return '';
        });
        body=body.replace(/\bimport\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]\s*;?/g,(_,names,spec)=>{
            const dep=resolve(file,spec);deps.push(dep);collect(dep);
            for(const [original,alias]of bindingPairs(names))imports.push([alias||original,id(dep),original]);return '';
        });
        body=body.replace(/\bexport\s+(?=(?:async\s+)?function\s+([\w$]+)|(?:const|let|var)\s+([\w$]+))/g,(_,fn,variable)=>{const name=fn||variable;exports.set(name,name);return '';});
        body=body.replace(/\bexport\s*\{([^}]+)\}\s*;?/g,(_,names)=>{for(const[original,alias]of bindingPairs(names))exports.set(alias||original,original);return '';});
        if(/\b(?:import\s*\(|import\.meta|export\s+default)/.test(body))throw Error('Unsupported module syntax in '+file);
        const definitions=[...exports].map(([name,expression])=>JSON.stringify(name)+':{enumerable:true,get:()=>'+expression+'}').join(',');
        const code='with(__datesScope){Object.defineProperties(__datesExports,{'+definitions+'});'+[...new Set(deps)].map(dep=>'__datesRequire('+JSON.stringify(id(dep))+');').join('')+'\n'+body+'\n}';
        // Parse every generated factory now, rather than shipping a broken HTML file.
        new Function('__datesScope','__datesExports','__datesRequire',code);
        modules.set(file,{imports,code});
    }
    collect(entry);
    const definitions=[...modules].map(([file,value])=>JSON.stringify(id(file))+':{imports:'+JSON.stringify(value.imports)+',run:new Function("__datesScope","__datesExports","__datesRequire",'+JSON.stringify(value.code)+')}').join(',\n');
    return '(function(){const definitions={'+definitions+'};const cache=Object.create(null);function load(id){if(cache[id])return cache[id];const record=definitions[id];if(!record)throw Error("Missing Dates module: "+id);const exports=cache[id]=Object.create(null),scope=Object.create(null);for(const[local,dep,original]of record.imports)Object.defineProperty(scope,local,{enumerable:true,get:()=>load(dep)[original]});record.run(scope,exports,load);return exports;}load('+JSON.stringify(id(entry))+');})();';
}
function safeScript(text){return text.replace(/<\/script/gi,'<\\/script');}
function build(page,output,renderer=false){
    const filename=path.join(source,page);let html=fs.readFileSync(filename,'utf8');
    html=html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g,tag=>{
        const href=tag.match(/href="([^"]+)"/)?.[1];if(!href||/^https?:/.test(href))return tag;
        return '<style>\n'+fs.readFileSync(resolve(filename,href),'utf8')+'\n</style>';
    });
    html=html.replace(/<script\s+type="module"\s+src="([^"]+)"\s*><\/script>/,(_,spec)=>{
        const packed=bundle(resolve(filename,spec));
        const vendor=renderer?'<script>'+safeScript(fs.readFileSync(path.join(source,'vendor/html2canvas.min.js'),'utf8'))+'</script>\n':'';
        return vendor+'<script id="dates-app-bundle">'+safeScript(packed)+'</script>';
    });
    if(/<script[^>]+\bsrc=|<link[^>]+rel="stylesheet"[^>]+href="(?!https:)/.test(html))throw Error('Unbundled local asset in '+output);
    const license=renderer?fs.readFileSync(path.join(source,'licenses/html2canvas-LICENSE.txt'),'utf8'):'';
    html='<!-- QuranAQ-v1030.26 Dates: standalone HTML; books remain on GitHub.\n'+license.replace(/-->/g,'-- >')+'\n-->\n'+html;
    fs.writeFileSync(path.join(root,output),html,'utf8');console.log(output+': '+Buffer.byteLength(html)+' bytes');
}
build('index.html','index.html',true);build('editor/index.html','Editor.html');build('test-generator/index.html','Test-Generator.html');
