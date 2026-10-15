"""Build three original, fully volumetric reading still lifes.

Blender --background --python scripts/blender/build_reading_models.py [-- SCENE]
No camera projection, reference painting, or runtime procedural material is used.
All typography is editable native Chinese text converted to meshes for glTF.
"""
import bpy
import json
import math
import random
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/site/models/reading'
SOURCE = ROOT / 'assets/blender'
OUT.mkdir(parents=True, exist_ok=True)
RNG = random.Random(240)

PALETTE = {
    'paper': (.79, .69, .51), 'ivory': (.91, .83, .66),
    'edge': (.56, .45, .30), 'ink': (.045, .065, .065),
    'cloth': (.025, .084, .083), 'redcloth': (.24, .065, .045),
    'bronze': (.56, .36, .115), 'gold': (.78, .55, .22),
    'walnut': (.13, .062, .031), 'woodgrain': (.205, .108, .054),
    'seal': (.44, .045, .022), 'line': (.31, .25, .16),
    'ribbon': (.45, .16, .052), 'document': (.86, .79, .66),
}

def mat(name, color, metal=0, rough=.65):
    m = bpy.data.materials.new(name); m.use_nodes = True
    s = m.node_tree.nodes.get('Principled BSDF')
    s.inputs['Base Color'].default_value = (*color, 1)
    s.inputs['Roughness'].default_value = rough
    s.inputs['Metallic'].default_value = metal
    return m

def parent(obj, p):
    if p: obj.parent = p
    return obj

def mesh(name, vertices, faces, material, p=None):
    data = bpy.data.meshes.new(name); data.from_pydata(vertices, [], faces); data.update()
    obj = bpy.data.objects.new(name, data); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return parent(obj, p)

def cube(name, at, dims, material, p=None, bevel=.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=at)
    obj = bpy.context.object; obj.name = name; obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    if bevel:
        modifier = obj.modifiers.new('Hand finished edge', 'BEVEL')
        modifier.width = bevel; modifier.segments = 2
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        for polygon in obj.data.polygons: polygon.use_smooth = True
        normal = obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=normal.name)
    return parent(obj, p)

def empty(name, at=(0,0,0), rotation=(0,0,0)):
    obj = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(obj)
    obj.location = at; obj.rotation_euler = rotation
    return obj

def path(name, points, material, radius=.009, p=None, cyclic=False):
    data = bpy.data.curves.new(name, 'CURVE'); data.dimensions = '3D'
    data.resolution_u = 1; data.bevel_depth = radius; data.bevel_resolution = 1
    spline = data.splines.new('POLY'); spline.points.add(len(points)-1)
    for point, xyz in zip(spline.points, points): point.co = (*xyz, 1)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material); return parent(obj, p)

def cylinder(name, at, radius, depth, material, p=None, vertices=24, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=at)
    obj = bpy.context.object; obj.name = name; obj.rotation_euler = rotation
    obj.data.materials.append(material)
    for poly in obj.data.polygons: poly.use_smooth=True
    return parent(obj, p)

def text(name, body, at, size, material, p=None, rotation=(0,0,0)):
    data = bpy.data.curves.new(name, 'FONT'); data.body = body; data.font = FONT
    data.size=size; data.align_x='CENTER'; data.align_y='CENTER'
    # Printed ink needs no extruded/bevelled side walls. Keeping glyphs planar
    # avoids hundreds of invisible triangles per character in the GLB.
    data.resolution_u=2; data.extrude=0; data.bevel_depth=0
    obj = bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj)
    obj.location=at; obj.rotation_euler=rotation; obj.data.materials.append(material)
    return parent(obj,p)

def border(name, x0, x1, y0, y1, z, material, p=None, radius=.006):
    return path(name,[(x0,y0,z),(x1,y0,z),(x1,y1,z),(x0,y1,z)],material,radius,p,True)

def setup(name, scale=7.3, aim=(0,0,.55)):
    global M, FONT
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M={k:mat(k,v, .62 if k in ('gold','bronze') else 0,
             .32 if k in ('gold','bronze','seal') else .69) for k,v in PALETTE.items()}
    FONT=bpy.data.fonts.load('C:/Windows/Fonts/simkai.ttf')
    scene=bpy.context.scene; scene.name=name
    scene.render.engine='CYCLES'; scene.cycles.samples=32; scene.cycles.use_denoising=True
    scene.render.resolution_x=1200; scene.render.resolution_y=800
    scene.render.resolution_percentage=100; scene.render.film_transparent=True
    scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGBA'
    scene.render.image_settings.compression=100
    scene.view_settings.view_transform='AgX'; scene.view_settings.look='AgX - Medium High Contrast'
    scene.view_settings.exposure=.15
    world=bpy.data.worlds.new('Neutral studio ambient'); world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.21,.25,.27,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.5; scene.world=world
    cam=bpy.data.cameras.new('Reading exhibition camera'); camera=bpy.data.objects.new(cam.name,cam)
    scene.collection.objects.link(camera); camera.location=(7,-10,9)
    camera.rotation_euler=(Vector(aim)-camera.location).to_track_quat('-Z','Y').to_euler()
    cam.type='ORTHO'; cam.ortho_scale=scale; cam.clip_end=100; scene.camera=camera
    lights=[
      {'name':'Warm key softbox','position':[-3,-4,8],'energy':900,'color':[1,.87,.66],'size':5},
      {'name':'Cool reflected fill','position':[5,-1,5],'energy':430,'color':[.72,.83,1],'size':5},
      {'name':'Gold rim softbox','position':[1,5,6],'energy':760,'color':[1,.78,.48],'size':3.5},
    ]
    for info in lights:
        x,y,z=info['position']; info['threePosition']=[x,z,-y]
        light=bpy.data.lights.new(info['name'],'AREA'); light.energy=info['energy']
        light.color=info['color']; light.size=info['size']
        obj=bpy.data.objects.new(light.name,light); scene.collection.objects.link(obj)
        obj.location=info['position']; obj.rotation_euler=(Vector((0,0,.3))-obj.location).to_track_quat('-Z','Y').to_euler()
    MANIFEST[name]={
      'poster':name+'-poster.png','model':name+'.glb','width':1200,'height':800,
      'coordinateSystem':'blender-z-up',
      'camera':{'type':'orthographic','position':list(camera.location),'target':list(aim),'scale':scale,
                'threePosition':[camera.location.x,camera.location.z,-camera.location.y],
                'threeTarget':[aim[0],aim[2],-aim[1]]},
      'lighting':lights,'ambient':{'color':[.21,.25,.27],'strength':.5},
      'renderer':{'colorSpace':'srgb','viewTransform':'AgX','look':'medium-high-contrast','exposure':.15,
                  'threeExposureMultiplier':2**.15},
      'notes':'Original meshes. Constant Principled materials. PNG is the color-accurate offline rendering; realtime lights are an approximation.'
    }
    return scene

def plinth(width=5.7, depth=3.65):
    cube('Walnut display tray',(0,0,-.16),(width,depth,.25),M['walnut'],bevel=.09)
    cube('Lower bronze rim',(0,0,-.28),(width-.08,depth-.08,.035),M['bronze'],bevel=.025)
    # Visible but quiet real wood-inlay strokes, not a runtime texture.
    for i in range(11):
        y=-depth/2+.22+i*(depth-.44)/10
        path('Subtle walnut grain', [(-width/2+.15,y,-.029),(-1.4,y+.024,-.029),(.6,y-.022,-.029),(width/2-.15,y,-.029)],
             M['woodgrain'],.0025)

def closed_book(name, title, at, width=1.62, depth=2.25, thickness=.33,
                cloth='cloth', rotation=(0,0,0), pages=12):
    p=empty(name,at,rotation)
    cube(name+' lower board',(0,0,.035),(width,depth,.065),M[cloth],p,.035)
    for i in range(pages):
        z=.08+i*(thickness-.14)/pages
        cube(name+' leaf '+str(i),(0.025,0,z),(width-.09,depth-.10,(thickness-.14)/pages*.78),
             M['paper'] if i%3 else M['ivory'],p,.005)
    cube(name+' front board',(0,0,thickness),(width,depth,.075),M[cloth],p,.035)
    cube(name+' cloth spine',(-width/2+.026,0,thickness/2+.035),(.095,depth-.012,thickness),M[cloth],p,.024)
    for x in (-width/2+.13,-width/2+.19):
        path(name+' binding rule',[(x,-depth/2+.07,thickness+.041),(x,depth/2-.07,thickness+.041)],M['bronze'],.0035,p)
    # Four hand-sewn binding holes and a continuous linen thread.
    holes=[-depth*.33,-depth*.12,depth*.12,depth*.33]
    for y in holes:
        path(name+' thread knot',[(-width/2+.14,y-.025,thickness+.047),(-width/2-.018,y,thickness+.046),
              (-width/2-.035,y, .02),(-width/2+.14,y+.025,.013)],M['edge'],.007,p)
    plate_x=width*.24; plate_w=.33
    cube(name+' title slip',(plate_x,.15,thickness+.045),(plate_w,depth*.70,.009),M['paper'],p,.007)
    border(name+' slip rule',plate_x-plate_w/2+.025,plate_x+plate_w/2-.025,
           .15-depth*.35+.035,.15+depth*.35-.035,thickness+.051,M['line'],p,.002)
    step=min(.29,depth*.57/max(len(title),1))
    for i,ch in enumerate(title):
        text(name+' title '+str(i),ch,(plate_x,.15+(len(title)-1)/2*step-i*step,thickness+.058),step*.86,M['ink'],p)
    border(name+' cover tooling',-width/2+.25,width/2-.10,-depth/2+.09,depth/2-.09,
           thickness+.041,M['bronze'],p,.0028)
    # Gold corner tooling and small geometric cloth irregularities.
    for x in (-width/2+.27,width/2-.12):
        for y in (-depth/2+.11,depth/2-.11):
            path(name+' corner tooling',[(x,y+.10,thickness+.043),(x,y,thickness+.043),
                (x+.10,y,thickness+.043)],M['gold'],.0035,p)
    return p

def page_height(x,z):
    t=abs(x)/1.67
    return z+.035+.15*math.sin(math.pi*t)+.025*t

def open_book():
    p=empty('Open thread-bound reading book',(-.45,-.28,.04),(0,0,math.radians(-10)))
    for side in (-1,1):
        cube('Open book cloth board '+str(side),(side*.87,0,.015),(1.73,2.40,.055),M['cloth'],p,.04)
        # Every sheet is a slightly bowed physical surface with its own outer edge.
        for layer in range(24):
            z=.055+layer*.0062
            verts=[]; nx=18
            for y in (-1.13,1.13):
                for i in range(nx+1):
                    x=side*(.045+i/nx*1.63)
                    verts.append((x,y,page_height(x,z)))
            faces=[]
            for i in range(nx): faces.append((i,i+1,nx+2+i,nx+1+i))
            mesh('Bowed ivory page '+str(side)+' '+str(layer),verts,faces,
                 M['ivory'] if layer%3 else M['paper'],p)
            if layer%2==0:
                path('Physical page edge',verts[:nx+1],M['edge'],.0019,p)
        topz=.055+23*.0062
        # Traditional ruling follows the curvature of the final page.
        for x in [side*(.24+j*.16) for j in range(8)]:
            path('Vertical reading column',[(x,-.90,page_height(x,topz)+.006),
                 (x,.92,page_height(x,topz)+.006)],M['line'],.0025,p)
        for y in (-.94,.96):
            points=[(side*(.20+i/16*1.31),y,page_height(side*(.20+i/16*1.31),topz)+.006) for i in range(17)]
            path('Curved page frame',points,M['line'],.0035,p)
    path('Open central binding',[(-.037,-1.15,.22),(0,-.4,.217),(0,.4,.217),(-.037,1.15,.22)],M['paper'],.024,p)
    # Short, real public-domain quotation. Sparse typesetting leaves the paper visible.
    for i,ch in enumerate('通古今之变'):
        x=.55; y=.65-i*.235; z=page_height(x,.055+23*.0062)+.012
        text('Sima Qian quotation '+str(i),ch,(x,y,z),.145,M['ink'],p)
    text('Source book title','史记',(-.67,.69,page_height(-.67,.055+23*.0062)+.015),.19,M['ink'],p)
    cube('Printed red reading seal',(-1.03,-.66,page_height(-1.03,.055+23*.0062)+.014),(.17,.17,.003),M['seal'],p,.003)
    border('Red seal inner rule',-1.09,-.97,-.72,-.60,page_height(-1.03,.055+23*.0062)+.018,M['ivory'],p,.004)
    # Bookmark drapes over the fore-edge, terminating naturally on the tray.
    path('Bronze silk bookmark',[(-.02,.94,.228),(.10,.40,.219),(.16,-.50,.223),(.21,-1.14,.223),(.24,-1.29,.015),(.26,-1.45,.005)],M['ribbon'],.026,p)
    return p

def inkstone(at=(1.92,.28,.0)):
    p=empty('Carved inkstone',at,(0,0,math.radians(-13)))
    cube('Inkstone base',(0,0,.1),(.87,1.20,.22),M['ink'],p,.15)
    cube('Inkstone well',(0,-.12,.22),(.62,.69,.012),M['cloth'],p,.12)
    cube('Glossy ink surface',(0,-.14,.232),(.50,.54,.006),mat('Wet pooled ink',(.012,.022,.022),.08,.12),p,.10)
    for k in range(3):
        path('Inkstone carved ridges',[(-.27,.35+k*.05,.232),(.27,.35+k*.05,.232)],M['bronze'],.0035,p)
    return p

def brush(at=(1.8,-1.15,.20),angle=math.pi-.55):
    p=empty('Calligraphy brush',at,(0,0,angle))
    cylinder('Bamboo handle',(0,0,0),.044,1.80,M['woodgrain'],p,20,(0,math.pi/2,0))
    for x in (-.75,-.12,.50):
        cylinder('Bamboo node',(x,0,0),.048,.028,M['bronze'],p,20,(0,math.pi/2,0))
    cylinder('Brush ferrule',(-.93,0,0),.06,.18,M['ink'],p,24,(0,math.pi/2,0))
    bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=.063,radius2=.008,depth=.30,location=(-1.17,0,0),rotation=(0,-math.pi/2,0))
    obj=bpy.context.object; obj.name='Tapered brush bristles'; obj.data.materials.append(M['edge']); obj.parent=p
    path('Brush rest',[(-.72,-.17,-.05),(-.72,0,.055),(-.72,.17,-.05)],M['bronze'],.035,p)
    return p

def seal(at):
    p=empty('Vermilion seal stone',at,(0,0,math.radians(10)))
    cube('Seal base',(0,0,.08),(.33,.33,.16),M['seal'],p,.022)
    cube('Seal handle',(0,0,.235),(.23,.23,.21),M['redcloth'],p,.028)
    text('Seal face glyph','史',(0,0,.349),.16,M['gold'],p)
    return p

def scroll(at=(0,1.15,.10),length=3.9):
    p=empty('Handscroll with ivory paper',at,(0,0,.06))
    vertices=[]; n=32
    for y in (-.45,.45):
        for i in range(n+1):
            x=-length/2+i/n*length
            z=.045+.075*math.sin(i/n*math.pi)**2
            vertices.append((x,y,z))
    faces=[(i,i+1,n+2+i,n+1+i) for i in range(n)]
    mesh('Unrolled curved paper',vertices,faces,M['paper'],p)
    for x in (-length/2,length/2):
        cylinder('Rolled parchment',(x,0,.115),.14,.93,M['ivory'],p,40,(math.pi/2,0,0))
        cylinder('Scroll walnut core',(x,0,.115),.051,1.15,M['walnut'],p,24,(math.pi/2,0,0))
        for y in (-.56,.56):
            cylinder('Bronze scroll end',(x,y,.115),.079,.05,M['bronze'],p,24,(math.pi/2,0,0))
    for y in (-.36,.36):
        path('Scroll border',[(-length/2+.17+i/(n-4)*(length-.34),y,.05+.075*math.sin((i+2)/n*math.pi)**2) for i in range(n-3)],M['line'],.003,p)
    return p

def documents(at=(.55,-.18,.15)):
    p=empty('Modern archival dossier',at,(0,0,-.10))
    cube('Walnut archive backing',(0,0,.0),(2.53,2.29,.09),M['redcloth'],p,.035)
    for i in range(17):
        x=(i%3-1)*.008; y=(i%2)*.009; z=.065+i*.008
        cube('Archival sheet '+str(i),(x,y,z),(2.34,2.11,.007),M['document'] if i%3 else M['ivory'],p,.002)
    z=.065+16*.008+.007
    border('Document double border',-1.04,1.04,-.93,.93,z,M['edge'],p,.0025)
    border('Document inner rule',-1.00,1.00,-.89,.89,z+.001,M['edge'],p,.0015)
    text('Modern dossier title','历史文献',(0,.55,z+.006),.235,M['ink'],p)
    path('Document title rule',[(-.82,.32,z+.005),(.82,.32,z+.005)],M['line'],.003,p)
    for row in range(8):
        y=.10-row*.104
        path('Typed document baseline',[(-.76,y,z+.006),(.74 if row%3 else .42,y,z+.006)],M['edge'],.0023,p)
    cube('Modern red stamp',(.63,-.57,z+.008),(.32,.32,.004),M['seal'],p,.008)
    border('Stamp negative frame',.49,.77,-.71,-.43,z+.012,M['document'],p,.004)
    text('Archive stamp glyph','档',(.63,-.57,z+.015),.22,M['document'],p)
    # Metal archival clip has actual depth and an open wire loop.
    cube('Archive clip flat back',(0,1.08,z+.03),(.64,.13,.065),M['bronze'],p,.035)
    path('Archive clip loop',[(-.23,1.09,z+.045),(-.23,1.23,z+.17),(.23,1.23,z+.17),(.23,1.09,z+.045)],M['gold'],.018,p)
    return p

def build_desk():
    scene=setup('reading-desk',7.2,(0,0,.10)); plinth(5.55,3.60)
    open_book(); inkstone(); brush(); seal((1.54,.95,.0))
    return scene

def build_archive():
    scene=setup('archive-books',8.6,(0,.0,.75)); plinth(5.55,3.70)
    scroll((-.1,.93,.11),4.15)
    closed_book('Standing green history','汉书',(-1.63,.68,1.19),1.48,2.25,.27,
                'cloth',(math.radians(78),0,-.10))
    closed_book('Standing red history','三国志',(-.1,.90,1.22),1.42,2.32,.31,
                'redcloth',(math.radians(81),0,.03))
    closed_book('Resting golden history','史记',(1.52,-.32,.10),1.54,2.24,.38,
                'walnut',(0,0,-.14))
    # Detailed bronze bookmark rests beside the foreground volume.
    bookmark=empty('Openwork bronze bookmark',(-.54,-1.06,.10),(0,0,-.24))
    cube('Bookmark plate',(0,0,.015),(.20,.95,.032),M['bronze'],bookmark,.03)
    border('Bookmark incised rule',-.065,.065,-.38,.38,.033,M['gold'],bookmark,.005)
    text('Bookmark native glyph','读',(0,.11,.039),.14,M['ink'],bookmark)
    path('Bookmark red tassel',[(0,-.48,.036),(.12,-.64,.042),(.16,-.84,.0)],M['ribbon'],.026,bookmark)
    seal((-.65,-.59,.0))
    return scene

def build_modern():
    scene=setup('modern-archive',8.6,(0,0,.65)); plinth(5.6,3.60)
    closed_book('Qing historical volume','清史稿',(-1.65,.60,1.11),1.36,2.09,.30,
                'cloth',(math.radians(76),0,-.13))
    closed_book('Republic historical volume','近代史',(-1.35,-.10,.10),1.45,2.10,.27,
                'redcloth',(0,0,.13))
    documents((.80,-.34,.18))
    folder=empty('Standing archival folder',(1.64,.87,1.13),(math.radians(77),0,-.12))
    cube('Archive folder board',(0,0,.02),(1.49,2.15,.085),M['edge'],folder,.02)
    cube('Archive folder facing',(0,0,.069),(1.40,2.06,.014),M['paper'],folder,.01)
    border('Folder ruled label',-.55,.55,-.54,.56,.081,M['line'],folder,.003)
    text('Folder genuine Chinese title','文献档案',(0,.26,.086),.245,M['ink'],folder)
    text('Folder dates','1949 — 2026',(0,-.13,.086),.098,M['line'],folder)
    for y in (-.80,.78):
        cylinder('Archive fastening stud',(.42,y,.085),.037,.022,M['bronze'],folder,24)
    path('Folder retention cord',[(.42,-.80,.096),(.45,.0,.101),(.42,.78,.096)],M['ribbon'],.013,folder)
    seal((2.06,-1.30,.0))
    return scene

def export(scene,name):
    # Explicitly convert typographic and curve details to real glTF meshes.
    for obj in list(scene.objects):
        if obj.type in ('CURVE','FONT'):
            bpy.context.view_layer.objects.active=obj; obj.select_set(True)
            bpy.ops.object.convert(target='MESH'); obj.select_set(False)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(name+'.blend')))
    scene.render.filepath=str(OUT/(name+'-poster.png'))
    print('RENDERING '+name,flush=True)
    bpy.ops.render.render(write_still=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',
        export_cameras=True,export_extras=True,export_lights=False,
        export_apply=True,use_active_scene=True)
    poster=bpy.data.images.load(str(OUT/(name+'-poster.png')),check_existing=False)
    w,h=poster.size
    corners=[poster.pixels[(y*w+x)*4+3] for x,y in [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]]
    if any(alpha>0 for alpha in corners):
        raise RuntimeError(name+' poster lost its transparent outer corners')
    model_bytes=(OUT/(name+'.glb')).stat().st_size
    poster_bytes=(OUT/(name+'-poster.png')).stat().st_size
    MANIFEST[name]['validation']={
        'modelBytes':model_bytes,'posterBytes':poster_bytes,
        'transparentCornerAlpha':corners,
        'meshObjects':len([o for o in scene.objects if o.type=='MESH']),
    }
    if model_bytes>1200000: print('BUDGET WARNING GLB '+name+' '+str(model_bytes),flush=True)
    if poster_bytes>700000: print('BUDGET WARNING PNG '+name+' '+str(poster_bytes),flush=True)
    print('COMPLETED '+name,flush=True)

MANIFEST={}
SCENES={'reading-desk':build_desk,'archive-books':build_archive,'modern-archive':build_modern}
selection=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
for name,builder in SCENES.items():
    if selection and name not in selection: continue
    export(builder(),name)
manifest_path=OUT/'manifest.json'
if manifest_path.exists():
    previous=json.loads(manifest_path.read_text('utf-8')); previous.update(MANIFEST); MANIFEST=previous
for record in MANIFEST.values():
    record['coordinateSystem']='blender-z-up'
    for original,three in [('position','threePosition'),('target','threeTarget')]:
        x,y,z=record['camera'][original]; record['camera'][three]=[x,z,-y]
    for light in record['lighting']:
        x,y,z=light['position']; light['threePosition']=[x,z,-y]
    record['renderer']['threeExposureMultiplier']=2**record['renderer']['exposure']
manifest_path.write_text(json.dumps(MANIFEST,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
