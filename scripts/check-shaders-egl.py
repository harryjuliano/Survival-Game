"""Optional Linux-only offline GLSL compile/link check (Mesa EGL, no browser).
Usage: node scripts/export-shaders.mjs /tmp/room-decor-shaders
       python3 scripts/check-shaders-egl.py /tmp/room-decor-shaders
This does not validate WebGL browser capabilities, render quality, or FPS.
"""
import os,ctypes as c,sys
from pathlib import Path
os.environ.setdefault('EGL_PLATFORM','surfaceless');os.environ.setdefault('LIBGL_ALWAYS_SOFTWARE','1')
egl=c.CDLL('libEGL.so.1')
def api(name,result,args):
 f=getattr(egl,name);f.restype=result;f.argtypes=args;return f
ptr=c.c_void_p;I=c.c_int;U=c.c_uint
getdisplay=api('eglGetDisplay',ptr,[ptr]);initialize=api('eglInitialize',U,[ptr,c.POINTER(I),c.POINTER(I)]);bind=api('eglBindAPI',U,[U]);choose=api('eglChooseConfig',U,[ptr,c.POINTER(I),c.POINTER(ptr),I,c.POINTER(I)]);create=api('eglCreateContext',ptr,[ptr,ptr,ptr,c.POINTER(I)]);make=api('eglMakeCurrent',U,[ptr,ptr,ptr,ptr]);proc=api('eglGetProcAddress',ptr,[c.c_char_p]);
d=getdisplay(None);major=I();minor=I();assert initialize(d,c.byref(major),c.byref(minor)),'EGL initialize failed';assert bind(0x30A0);config=ptr();num=I();attrs=(I*7)(0x3033,1,0x3040,0x40,0x3024,8,0x3038);assert choose(d,attrs,c.byref(config),1,c.byref(num)) and num.value;context=create(d,config,None,(I*3)(0x3098,3,0x3038));assert context and make(d,None,None,context),'EGL context failed'
def gl(name,result,*args):return c.CFUNCTYPE(result,*args)(proc(name.encode()))
createShader=gl('glCreateShader',U,U);source=gl('glShaderSource',None,U,I,c.POINTER(c.c_char_p),c.POINTER(I));compileShader=gl('glCompileShader',None,U);getShader=gl('glGetShaderiv',None,U,U,c.POINTER(I));logShader=gl('glGetShaderInfoLog',None,U,I,c.POINTER(I),c.c_void_p);createProgram=gl('glCreateProgram',U);attach=gl('glAttachShader',None,U,U);link=gl('glLinkProgram',None,U);getProgram=gl('glGetProgramiv',None,U,U,c.POINTER(I));logProgram=gl('glGetProgramInfoLog',None,U,I,c.POINTER(I),c.c_void_p)
root=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/room-decor-shaders');fails=0
for vertex in sorted(root.glob('*.vert')):
 p=createProgram();valid=True
 for file,kind in [(vertex,35633),(vertex.with_suffix('.frag'),35632)]:
  shader=createShader(kind);data=file.read_bytes();s=c.c_char_p(data);length=I(len(data));source(shader,1,c.byref(s),c.byref(length));compileShader(shader);status=I();getShader(shader,0x8B81,c.byref(status))
  if not status.value:
   log=c.create_string_buffer(16384);logShader(shader,len(log),None,log);print(file.name,log.value.decode());fails+=1;valid=False
  attach(p,shader)
 if valid:
  link(p);status=I();getProgram(p,0x8B82,c.byref(status))
  if not status.value:
   log=c.create_string_buffer(16384);logProgram(p,len(log),None,log);print(vertex.stem,log.value.decode());fails+=1
  else:print(vertex.stem,'compile + link PASS')
print('Failed shader checks:',fails);sys.exit(bool(fails))
