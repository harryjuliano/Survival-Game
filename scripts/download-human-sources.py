"""Optional reconstruction input downloader; bundled game already contains the GLBs."""
from pathlib import Path
import hashlib,json,urllib.request,zipfile
root=Path(__file__).resolve().parents[1];dest=root/'asset-sources/makehuman';dest.mkdir(parents=True,exist_ok=True)
for entry in json.loads((root/'scripts/human-source-manifest.json').read_text()):
    path=dest/entry['path']
    if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest()!=entry['sha256']:
        req=urllib.request.Request(entry['url'],headers={'User-Agent':'RoomDecor3D-AssetPreparation/2.0'})
        with urllib.request.urlopen(req,timeout=120) as response,path.open('wb') as output:
            while chunk:=response.read(1024*1024):output.write(chunk)
        if hashlib.sha256(path.read_bytes()).hexdigest()!=entry['sha256']:raise ValueError('Source changed; review checksum and license: '+entry['path'])
    print('Verified',entry['path'])
prefixes=['skins/young_asian_male/','skins/young_asian_female/','clothes/male_casualsuit01/','clothes/female_casualsuit01/','clothes/shoes01/','hair/short01/','hair/bob01/','eyes/high-poly/','eyes/materials/brown_eye.png']
with zipfile.ZipFile(dest/'system.zip') as archive:
    for name in archive.namelist():
        if name.endswith('/') or not any(name.startswith(p) for p in prefixes):continue
        target=(dest/'system'/name).resolve()
        if not target.is_relative_to((dest/'system').resolve()):raise ValueError('Unsafe archive path')
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(archive.read(name))
print('Selected CC0 assets extracted to',dest)
