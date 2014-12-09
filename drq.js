
function __evalIt(module,exports,global,___content){
  
  function require(id){
    return module.require(id);
  }
  
  eval(___content);
}

(function(global){
  var RE = /^\w+:\/\/[\w\.:]+/,
      FNRE = /^\.\.?\//,
      path,paths;
  
  location.origin = location.origin || location.href.match(RE)[0];
  
  function get(url){
    var req = new XMLHttpRequest();
    req.open("GET",url,false);
    req.send();
    
    switch(Math.floor(req.status/100)){
      case 5: throw new Error('Server error ' + req.status);
      case 4: throw new Error('Client error ' + req.status);
    }
    
    return req.responseText;
  }
  
  function getPaths(filename){
    var i,j,paths,origin,m;
    
    if(filename instanceof Array) paths = filename.slice(0,-1);
    else{
      m = filename.match(RE);
      origin = m[0];
      filename = filename.slice(origin.length);
      
      paths = filename.split('/').slice(1).slice(0,-1);
      paths.unshift(origin);
    }
    
    if(paths.length > 1) paths[1] = paths[0] + '/' + paths[1];
    for(i = 2;i < paths.length;i++){
      paths[i] = paths[i - 1] + '/' + paths[i];
    }
    
    for(i = 0;i < paths.length;i++) paths[i] += '/node_modules';
    paths.reverse();
    
    return paths;
  }
  
  function resolve(pathname,basePath){
    var path,
        sp = basePath.split('//'),
        sp2 = sp[1].split('/'),
        paths,
        i;
    
    path = sp2.slice(1);
    path.unshift(sp[0] + '//' + sp2[0]);
    
    paths = pathname.split('/');
    
    for(i = 0;i < paths.length;i++){
      switch(paths[i] || ''){
        case '..':
          if(path.length == 1) throw new Error('Invalid path');
          path.pop();
        case '.':
        case '':
          continue;
        default:
          path.push(paths[i]);
      }
    }
    
    return path;
  }
  
  function loadAsFile(url,path,parent){
    var json,txt,
        djs = url + '.js',
        djson = url + '.json',
        module,
        filename;
    
    if(global.require.cache[url]) return global.require.cache[url].exports;
    if(global.require.cache[djs]) return global.require.cache[djs].exports;
    if(global.require.cache[djson]) return global.require.cache[djson].exports;
    
    try{
      txt = get(filename = url);
    }catch(e){
      try{
        txt = get(filename = djs);
      }catch(e){
        txt = get(filename = djson);
        json = true;
      }
    }
    
    if(json) return JSON.parse(txt);
    
    path = path.slice(0,-1);
    
    module = new Module(getPaths(path.concat('')),path.join('/'),filename,parent);
    if(parent != global) parent.children.push(module);
    global.require.cache[filename] = module;
    
    try{ __evalIt(module,module.exports,global,txt); }
    catch(e){
      delete global.require.cache[filename];
      throw e;
    }
    
    return module.exports;
  }
  
  function loadAsFolder(url,path,parent){
    var pkg,txt;
    
    try{
      txt = get(url + '/package.json');
      pkg = JSON.parse(txt);
      return loadAsFile(url + '/' + pkg.main,path,parent);
    }catch(e){
      return loadAsFile(url + '/index',path,parent);
    }
    
  }
  
  global.require = function(id){
    var filename,url,i,
        json = false,
        ps = this.paths || paths;
    
    if(id.charAt(0) == '/') filename = resolve(id,location.origin);
    else if(id.match(FNRE)) filename = resolve(id,this.path || path);
    
    if(filename){
      url = filename.join('/');
      try{ return loadAsFile(url,filename,this); }
      catch(e){ return loadAsFolder(url,filename.concat(''),this); }
    }
    
    for(i = 0;i < global.require.core.length;i++){
      filename = resolve(id,global.require.core[i]);
      url = filename.join('/');
      try{ return loadAsFolder(url,filename.concat(''),this); }
      catch(e){
        try{ return loadAsFile(url,filename,this); }
        catch(e){}
      }
    }
    
    for(i = 0;i < ps.length;i++){
      filename = resolve(id,ps[i]);
      url = filename.join('/');
      try{ return loadAsFolder(url,filename.concat(''),this); }
      catch(e){
        try{ return loadAsFile(url,filename,this); }
        catch(e){}
      }
    }
    
    throw new Error('Errors while processing \'' + id + '\'');
  };
  
  global.require.core = [];
  global.require.cache = {};
  
  paths = getPaths(location.href);
  path = location.origin + location.pathname.replace(/\/[^\/]*$/,'');
  
  function Module(paths,path,id,parent){
    this.paths = paths;
    this.path = path;
    this.id = id;
    this.parent = parent;
    this.children = [];
    this.exports = {};
  }
  
  Module.prototype.require = global.require;
  
  global.module = new Module(global.paths);
  
})(typeof window != 'undefined'?window:self);

