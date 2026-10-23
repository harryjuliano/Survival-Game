"""Build clothed, skinned GLBs from CC0 MakeHuman assets (no MakeHuman code used).
Usage: python scripts/build-characters.py --source /path/to/mh
Requires numpy, scipy, Pillow. Source pack paths documented in docs/ASSETS.md.
The animation clips below are original keyframe cycles, not motion capture.
"""
import argparse, json, struct, io, math, re
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.spatial import cKDTree
from scipy.spatial.transform import Rotation
P=argparse.ArgumentParser();P.add_argument('--source',type=Path,required=True);a=P.parse_args();src=a.source
out=Path('public/assets/characters');out.mkdir(parents=True,exist_ok=True)

def obj(path):
    v=[];uv=[];faces=[];group=''
    for l in path.read_text().splitlines():
        t=l.split()
        if not t:continue
        if t[0]=='v':v.append(list(map(float,t[1:4])))
        elif t[0]=='vt':uv.append([float(t[1]),1-float(t[2])])
        elif t[0]=='g':group=t[1]
        elif t[0]=='f':
            ids=[(int(x.split('/')[0])-1,int(x.split('/')[1])-1 if '/' in x and x.split('/')[1] else 0) for x in t[1:]]
            for j in range(1,len(ids)-1):faces.append((group,[ids[0],ids[j],ids[j+1]]))
    return np.array(v,dtype=float),np.array(uv,dtype=float),faces
base,baseuv,basefaces=obj(src/'base.obj');rig=json.loads((src/'default.mhskel').read_text());names=[n for n in rig['bones'] if n in ['root','head','spine01','spine02','spine03','spine04','spine05','neck01','neck02','neck03'] or n.split('.')[0] in ['pelvis','clavicle','shoulder01','upperarm01','upperarm02','lowerarm01','lowerarm02','wrist','upperleg01','upperleg02','lowerleg01','lowerleg02','foot']];index={n:i for i,n in enumerate(names)}
rawW=json.loads((src/'default_weights.mhw').read_text())['weights'];weights=np.zeros((len(base),len(names)))
for name,rows in rawW.items():
    while name not in index:name=rig['bones'][name]['parent']
    for vi,w in rows:weights[int(vi),index[name]]+=w
known=np.flatnonzero(weights.sum(1)>1e-8);missing=np.flatnonzero(weights.sum(1)<1e-8)
weights[missing]=weights[known[cKDTree(base[known]).query(base[missing])[1]]]
weights/=weights.sum(1)[:,None]

def fit(path,verts):
    rows=[];scales=np.ones(3);deleted=set();mode=False;delete=False
    for line in path.read_text().splitlines():
        t=line.split()
        if not t or t[0].startswith('#'):continue
        if t[0] in ['x_scale','y_scale','z_scale']:
            ax='xyz'.index(t[0][0]);scales[ax]=abs(verts[int(t[1]),ax]-verts[int(t[2]),ax])/float(t[3])
        elif t[0]=='verts':mode=True
        elif t[0]=='delete_verts':delete=True;mode=False
        elif delete:
            # e.g. 1355 - 1388 1393 - 1394 1402
            i=0
            while i<len(t):
                if not t[i].isdigit():i+=1;continue
                lo=int(t[i]);hi=lo
                if i+2<len(t) and t[i+1]=='-':hi=int(t[i+2]);i+=2
                deleted.update(range(lo,hi+1));i+=1
        elif mode and t[0].lstrip('-').isdigit():rows.append(t)
    result=[];ws=[]
    for t in rows:
        if len(t)==1:result.append(verts[int(t[0])]);ws.append(weights[int(t[0])]);continue
        ids=list(map(int,t[:3]));bary=np.array(list(map(float,t[3:6])));offset=np.array(list(map(float,t[6:9])))
        result.append((verts[ids]*bary[:,None]).sum(0)+offset*scales)
        w=(weights[ids]*np.maximum(bary,0)[:,None]).sum(0);ws.append(w/max(w.sum(),1e-9))
    return np.array(result),np.array(ws),deleted

class GLB:
    def __init__(self):
        self.data=bytearray();self.g={'asset':{'version':'2.0','generator':'Room Decor 3D / CC0 MakeHuman conversion'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'Character','children':[]}],'meshes':[],'skins':[],'materials':[],'textures':[],'images':[],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}],'buffers':[{}],'bufferViews':[],'accessors':[],'animations':[]}
    def blob(self,b):
        while len(self.data)%4:self.data.append(0)
        n=len(self.g['bufferViews']);self.g['bufferViews'].append({'buffer':0,'byteOffset':len(self.data),'byteLength':len(b)});self.data.extend(b);return n
    def acc(self,arr,typ):
        arr=np.ascontiguousarray(arr);component={'float32':5126,'uint32':5125,'uint16':5123}[str(arr.dtype)];n=len(self.g['accessors'])
        item={'bufferView':self.blob(arr.tobytes()),'componentType':component,'count':len(arr),'type':typ}
        if typ in ['VEC3','SCALAR']:
            item['min']=np.min(arr,axis=0).reshape(-1).tolist();item['max']=np.max(arr,axis=0).reshape(-1).tolist()
        self.g['accessors'].append(item);return n
    def image(self,path,alpha=False):
        im=Image.open(path).convert('RGBA' if alpha else 'RGB');im.thumbnail((1024,1024),Image.Resampling.LANCZOS);im.info.clear();b=io.BytesIO();im.save(b,format='PNG' if alpha else 'JPEG',quality=88,optimize=True)
        i=len(self.g['images']);self.g['images'].append({'bufferView':self.blob(b.getvalue()),'mimeType':'image/png' if alpha else 'image/jpeg'});self.g['textures'].append({'source':i,'sampler':0});return len(self.g['textures'])-1
    def mat(self,name,path,rough=.8,alpha=False,normal=None):
        m={'name':name,'pbrMetallicRoughness':{'baseColorTexture':{'index':self.image(path,alpha)},'metallicFactor':0,'roughnessFactor':rough},'doubleSided':True}
        if alpha:m.update(alphaMode='MASK',alphaCutoff=.35)
        if normal and normal.exists():m['normalTexture']={'index':self.image(normal),'scale':.5}
        self.g['materials'].append(m);return len(self.g['materials'])-1
    def mesh(self,name,pos,uv,faces,w,material):
        normals=np.zeros_like(pos)
        for _,face in faces:
            ids=[p[0] for p in face];p=pos[ids];normal=np.cross(p[1]-p[0],p[2]-p[0]);normals[ids]+=normal
        lengths=np.linalg.norm(normals,axis=1);normals/=np.maximum(lengths[:,None],1e-12)
        unique={};indices=[];vp=[];vt=[];vn=[];wj=[];ww=[]
        for _,face in faces:
            for key in face:
                if key not in unique:
                    unique[key]=len(vp);vi,ti=key;vp.append(pos[vi]);vt.append(uv[ti]);vn.append(normals[vi]);wi=np.argsort(w[vi])[-4:][::-1];wv=w[vi,wi];wv/=max(wv.sum(),1e-12);wi[wv<1e-8]=0;wj.append(wi);ww.append(wv)
                indices.append(unique[key])
        attrs={'POSITION':self.acc(np.array(vp,dtype='float32'),'VEC3'),'NORMAL':self.acc(np.array(vn,dtype='float32'),'VEC3'),'TEXCOORD_0':self.acc(np.array(vt,dtype='float32'),'VEC2'),'JOINTS_0':self.acc(np.array(wj,dtype='uint16'),'VEC4'),'WEIGHTS_0':self.acc(np.array(ww,dtype='float32'),'VEC4')}
        vp=np.array(vp);vt=np.array(vt);vn=np.array(vn);tan=np.zeros_like(vp);bit=np.zeros_like(vp)
        for tri in np.array(indices).reshape(-1,3):
            e1=vp[tri[1]]-vp[tri[0]];e2=vp[tri[2]]-vp[tri[0]];d1=vt[tri[1]]-vt[tri[0]];d2=vt[tri[2]]-vt[tri[0]];det=d1[0]*d2[1]-d2[0]*d1[1]
            if abs(det)>1e-12:tan[tri]+=(e1*d2[1]-e2*d1[1])/det;bit[tri]+=(e2*d1[0]-e1*d2[0])/det
        tan-=vn*(vn*tan).sum(1)[:,None];lengths=np.linalg.norm(tan,axis=1);missing=lengths<1e-8
        tan[missing]=np.cross(vn[missing],np.array([1,0,0]));lengths=np.linalg.norm(tan,axis=1);missing=lengths<1e-8;tan[missing]=np.cross(vn[missing],np.array([0,1,0]));tan/=np.maximum(np.linalg.norm(tan,axis=1)[:,None],1e-8)
        handed=np.where((np.cross(vn,tan)*bit).sum(1)<0,-1,1);attrs['TANGENT']=self.acc(np.column_stack([tan,handed]).astype('float32'),'VEC4')
        mid=len(self.g['meshes']);self.g['meshes'].append({'name':name,'primitives':[{'attributes':attrs,'indices':self.acc(np.array(indices,dtype='uint32'),'SCALAR'),'material':material}]})
        node=len(self.g['nodes']);self.g['nodes'].append({'name':name,'mesh':mid,'skin':0});self.g['scenes'][0]['nodes'].append(node)
    def save(self,path):
        for mesh in self.g['meshes']:
            for p in mesh['primitives']:
                for accid in p['attributes'].values():self.g['bufferViews'][self.g['accessors'][accid]['bufferView']]['target']=34962
                self.g['bufferViews'][self.g['accessors'][p['indices']]['bufferView']]['target']=34963
        self.g['buffers'][0]['byteLength']=len(self.data);j=json.dumps(self.g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);self.data+=b'\0'*((-len(self.data))%4)
        path.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(j)+len(self.data))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(self.data),b'BIN\0')+self.data)

for gender,height in [('male',1.8),('female',1.68)]:
    verts=base.copy()
    for l in (src/f'asian-{gender}-young.target').read_text().splitlines():
        t=l.split()
        if len(t)==4 and t[0].isdigit():verts[int(t[0])]+=np.array(list(map(float,t[1:])))
    items=[];deleted=set()
    for kind,id in [('clothes',gender+'_casualsuit01'),('clothes','shoes01'),('hair','short01' if gender=='male' else 'bob01'),('eyes','high-poly')]:
        folder=src/'system'/kind/id;p,u,f=obj(folder/(id+'.obj'));fitted,w,d=fit(folder/(id+'.mhclo'),verts)
        assert len(fitted)==len(p),(id,len(fitted),len(p))
        items.append((kind,id,folder,fitted,u,f,w));deleted|=d
    bodyfaces=[(g,f) for g,f in basefaces if g=='body' and not any(v in deleted for v,t in f)]
    bodyids=list({v for g,f in basefaces if g=='body' for v,t in f});low=min(verts[bodyids,1].min(),min(p[:,1].min() for _,_,_,p,_,_,_ in items));scale=height/(verts[bodyids,1].max()-low)
    def scaled(v):return (v-np.array([0,low,0]))*scale
    glb=GLB();heads={n:scaled(verts[rig['joints'][rig['bones'][n]['head']]].mean(0)) for n in names}
    for n in names:
        b=rig['bones'][n];parent=b['parent'];node={'name':n,'translation':(heads[n]-heads[parent] if parent else heads[n]).tolist()};glb.g['nodes'].append(node)
    for n in names:
        parent=rig['bones'][n]['parent'];pi=index[parent]+1 if parent else 0;glb.g['nodes'][pi].setdefault('children',[]).append(index[n]+1)
    inv=[]
    for n in names:
        m=np.eye(4);m[:3,3]=-heads[n];inv.append(m.T.reshape(16))
    glb.g['skins'].append({'name':'MakeHuman default rig','joints':[index[n]+1 for n in names],'skeleton':index['root']+1,'inverseBindMatrices':glb.acc(np.array(inv,dtype='float32'),'MAT4')})
    skin=src/'system'/'skins'/('young_asian_'+gender)/('young_lightskinned_'+gender+'_diffuse3.png');material=glb.mat('Skin',skin,.7)
    glb.mesh('Body',scaled(verts),baseuv,bodyfaces,weights,material)
    for kind,id,folder,p,u,f,w in items:
        diffuse=src/'system/eyes/materials/brown_eye.png' if kind=='eyes' else folder/(id+'_diffuse.png')
        material=glb.mat(id,diffuse,.25 if kind=='eyes' else .85,kind=='hair',folder/(id+'_normal.png'))
        glb.mesh(id,scaled(p),u,f,w,material)
    # Smooth original cycles on the authored weighted rig. Identity bind orientations
    # make these axis rotations world-aligned in the neutral pose.
    animated=['root','spine03','head']+[f'{bone}.{s}' for s in ['L','R'] for bone in ['upperarm01','lowerarm01','upperleg01','lowerleg01','foot']]
    for clip,duration in [('Idle',3.6),('Walk',1.05),('Run',.68),('Jump',.9)]:
        times=np.linspace(0,duration,49,dtype='float32');tacc=glb.acc(times,'SCALAR');anim={'name':clip,'samplers':[],'channels':[]}
        for n in animated:
            quats=[]
            for t in times:
                phase=float(t/duration)*2*math.pi;side=1 if n.endswith('.L') else -1;wave=math.sin(phase+(0 if side==1 else math.pi));x=y=z=0
                if n.startswith('upperarm01'):
                    z=-side*.52;x=.02*math.sin(phase)
                    if clip in ['Walk','Run']:x=-wave*(.35 if clip=='Walk' else .65)
                    if clip=='Jump':x=-.5;z=-side*.15
                elif n.startswith('lowerarm01'):
                    x=-.13 if clip=='Idle' else (-.65 if clip=='Run' else -.25)
                    if clip=='Jump':x=-.9
                elif n.startswith('upperleg01'):
                    if clip in ['Walk','Run']:x=wave*(.38 if clip=='Walk' else .68)
                    if clip=='Jump':x=-.25
                elif n.startswith('lowerleg01'):
                    if clip in ['Walk','Run']:x=max(0,-wave)*(.65 if clip=='Walk' else 1.0)
                    if clip=='Jump':x=.65
                elif n.startswith('foot'):
                    if clip in ['Walk','Run']:x=-max(0,-wave)*.25
                    if clip=='Jump':x=-.2
                elif n=='spine03':x=-.07 if clip=='Run' else .01*math.sin(phase);y=.025*math.sin(phase) if clip in ['Walk','Run'] else 0
                elif n=='head':y=.025*math.sin(phase);x=.008*math.sin(phase)
                quats.append(Rotation.from_euler('xyz',[x,y,z]).as_quat())
            output=glb.acc(np.array(quats,dtype='float32'),'VEC4');sampler=len(anim['samplers']);anim['samplers'].append({'input':tacc,'output':output,'interpolation':'LINEAR'});anim['channels'].append({'sampler':sampler,'target':{'node':index[n]+1,'path':'rotation'}})
        rootbase=heads['root'];positions=[]
        for t in times:
            phase=float(t/duration)*2*math.pi;bob=.004*math.sin(phase) if clip=='Idle' else (.014 if clip=='Walk' else .025)*(1-math.cos(phase*2)) if clip in ['Walk','Run'] else 0
            positions.append(rootbase+np.array([0,bob,0]))
        output=glb.acc(np.array(positions,dtype='float32'),'VEC3');sampler=len(anim['samplers']);anim['samplers'].append({'input':tacc,'output':output,'interpolation':'LINEAR'});anim['channels'].append({'sampler':sampler,'target':{'node':index['root']+1,'path':'translation'}});glb.g['animations'].append(anim)
    glb.g['asset']['copyright']='MakeHuman core/system assets: CC0; original conversion and animation: Room Decor 3D'
    glb.save(out/(gender+'.glb'));print(gender,'bones',len(names),'triangles',sum(len(f) for _,_,_,_,_,f,_ in items)+len(bodyfaces),'bytes',(out/(gender+'.glb')).stat().st_size)
