
function __evalIt(module,exports,global,___content){

  function require(id){
    return module.require(id);
  }

  eval(___content);
}

(function(global){
  var RE = /^\w+:\/\/[\w\.:]+/,
      FNRE = /^\.\.?\//,
      mains = {},
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
    var i,j,paths,origin,m,banned = [],offset = 0;

    if(filename instanceof Array) paths = filename.slice(0,-1);
    else{
      m = filename.match(RE);
      origin = m[0];
      filename = filename.slice(origin.length);

      paths = filename.split('/').slice(1).slice(0,-1);
      paths.unshift(origin);
    }

    for(i = 0;i < paths.length;i++) if(paths[i] == 'node_modules') banned.push(i);

    if(paths.length > 1) paths[1] = paths[0] + '/' + paths[1];
    for(i = 2;i < paths.length;i++) paths[i] = paths[i - 1] + '/' + paths[i];

    for(i = 0;i < banned.length;i++){
      paths.splice(banned[i] - offset,1);
      offset++;
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

  function loadAsFile(url,path,parent,bypass){
    var json,txt,
        djs = url + (url.indexOf('.js') == -1 ? '.js' : ''),
        djson = url + (url.indexOf('.json') == -1 ? '.json' : ''),
        module,
        filename;

    if(!bypass && global.require.cache[url]) return global.require.cache[url].exports;
    if(global.require.cache[djs]) return global.require.cache[djs].exports;
    if(global.require.cache[djson]) return global.require.cache[djson].exports;

    try{
      if(bypass) throw new Error();
      txt = get(filename = url);
      if (!txt) throw new Error();
    }catch(e){
      try{
        txt = get(filename = djs);
        if (!txt) throw new Error();
      }catch(e){
        txt = get(filename = djson);
        if (!txt) throw new Error();
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

  function loadAsFolderPkg(url,path,parent){
    var pkg,txt;

    txt = get(url + '/package.json');

    pkg = JSON.parse(txt);
    mains[url] = pkg.main;

    return loadAsFile(url + '/' + pkg.main,path,parent);
  }

  function loadAsFolder(url,path,parent){
    var pkg,txt;

    try{
      txt = get(url + '/package.json');

      pkg = JSON.parse(txt);
      mains[url] = pkg.main;

      return loadAsFile(url + '/' + pkg.main,path,parent);
    }catch(e){
      return loadAsFile(url + '/index',path,parent,true);
    }

  }

  function loadAsFileFromCache(url,bypass){
    var djs = url + (url.indexOf('.js') == -1 ? '.js' : ''),
        djson = url + (url.indexOf('.json') == -1 ? '.json' : '');

    if(!bypass && global.require.cache[url]) return global.require.cache[url].exports;
    if(global.require.cache[djs]) return global.require.cache[djs].exports;
    if(global.require.cache[djson]) return global.require.cache[djson].exports;

    throw new Error();
  }

  function loadAsFolderFromCache(url){
    var main;

    if(main = mains[url]){
      try{ return loadAsFileFromCache(url + '/' + main); }
      catch(e){ return loadAsFileFromCache(url + '/index',true); }
    }else return loadAsFileFromCache(url + '/index',true);
  }

  global.require = function(id){
    var filename,url,i,
        json = false,
        ps = this.paths || paths;

    if(id.charAt(0) == '/') filename = resolve(id,location.origin);
    else if(id.match(FNRE)) filename = resolve(id,this.path || path);

    if(filename){
      url = filename.join('/');
      try{
        if(global.require.tryCacheFirst){
          try{ return loadAsFileFromCache(url); }
          catch(e){ return loadAsFolderFromCache(url); }
        }else throw new Error();
      }catch(e){
        try{ return loadAsFile(url,filename,this); }
        catch(e){ return loadAsFolder(url,filename.concat(''),this); }
      }
    }

    if(global.require.tryCacheFirst){

      for(i = 0;i < global.require.core.length;i++){
        filename = resolve(id,global.require.core[i]);
        url = filename.join('/');
        try{ return loadAsFileFromCache(url); }
        catch(e){
          try{ return loadAsFolderFromCache(url); }
          catch(e){}
        }
      }

      for(i = 0;i < ps.length;i++){
        filename = resolve(id,ps[i]);
        url = filename.join('/');
        try{ return loadAsFileFromCache(url); }
        catch(e){
          try{ return loadAsFolderFromCache(url); }
          catch(e){}
        }
      }

    }

    if(id.indexOf('/') == -1){

      for(i = 0;i < global.require.core.length;i++){
        filename = resolve(id,global.require.core[i]);
        url = filename.join('/');
        try{ return loadAsFolderPkg(url,filename.concat(''),this); }
        catch(e){ }
      }

      for(i = 0;i < global.require.core.length;i++){
        filename = resolve(id,global.require.core[i]);
        url = filename.join('/');
        try{ return loadAsFile(url + '/index',filename.concat(''),this,true); }
        catch(e){ }
      }

      for(i = 0;i < ps.length;i++){
        filename = resolve(id,ps[i]);
        url = filename.join('/');
        try{ return loadAsFolderPkg(url,filename.concat(''),this); }
        catch(e){ }
      }

      for(i = 0;i < ps.length;i++){
        filename = resolve(id,ps[i]);
        url = filename.join('/');
        try{ return loadAsFile(url + '/index',filename.concat(''),this,true); }
        catch(e){ }
      }

      for(i = 0;i < global.require.core.length;i++){
        filename = resolve(id,global.require.core[i]);
        url = filename.join('/');
        try{ return loadAsFile(url,filename,this); }
        catch(e){ }
      }

      for(i = 0;i < ps.length;i++){
        filename = resolve(id,ps[i]);
        url = filename.join('/');
        try{ return loadAsFile(url,filename,this); }
        catch(e){ }
      }

    }else{

      for(i = 0;i < global.require.core.length;i++){
        filename = resolve(id,global.require.core[i]);
        url = filename.join('/');
        try{ return loadAsFile(url,filename,this); }
        catch(e){ }
      }

      for(i = 0;i < ps.length;i++){
        filename = resolve(id,ps[i]);
        url = filename.join('/');
        try{ return loadAsFile(url,filename,this); }
        catch(e){ }
      }

      for(i = 0;i < global.require.core.length;i++){
        filename = resolve(id,global.require.core[i]);
        url = filename.join('/');
        try{ return loadAsFolderPkg(url,filename.concat(''),this); }
        catch(e){ }
      }

      for(i = 0;i < global.require.core.length;i++){
        filename = resolve(id,global.require.core[i]);
        url = filename.join('/');
        try{ return loadAsFile(url + '/index',filename.concat(''),this,true); }
        catch(e){ }
      }

      for(i = 0;i < ps.length;i++){
        filename = resolve(id,ps[i]);
        url = filename.join('/');
        try{ return loadAsFolderPkg(url,filename.concat(''),this); }
        catch(e){ }
      }

      for(i = 0;i < ps.length;i++){
        filename = resolve(id,ps[i]);
        url = filename.join('/');
        try{ return loadAsFile(url + '/index',filename.concat(''),this,true); }
        catch(e){ }
      }

    }

    throw new Error('Errors while processing \'' + id + '\'');
  };

  global.require.core = [];
  global.require.cache = {};
  global.require.tryCacheFirst = false;

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

