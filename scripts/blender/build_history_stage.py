"""Build camera-mapped relief scroll and individually modelled books from the concept.

Run Blender --background --python scripts/blender/build_history_stage.py.
The fixed-view relief preserves the concept painting; it is not a reconstructed
360-degree architectural scene. Book bodies, pages, bindings and covers are meshes.
"""
import bpy, math, json
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/site/models/history'
SOURCE = ROOT / 'assets/blender'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
reference = bpy.data.images.load(str(SOURCE / 'history-reference.png'))
w, h = reference.size
pixels = np.array(reference.pixels[:], dtype=np.float32).reshape(h, w, 4)

def crop(name, box):
    x0, y0, x1, y1 = box
    data = pixels[h-y1:h-y0, x0:x1].copy()
    image = bpy.data.images.new(name, width=x1-x0, height=y1-y0, alpha=True)
    image.pixels.foreach_set(data.ravel())
    image.filepath_raw = str(OUT / (name + '.png'))
    image.file_format = 'PNG'; image.save(); image.pack()
    return image

def save_pixels(image, data):
    data=np.ascontiguousarray(data)
    data[data[:,:,3] == 0,:3]=0
    if image.packed_file:
        image.unpack(method='REMOVE')
    image.pixels.foreach_set(data.ravel())
    image.update()
    image.save(); image.pack()

def material(name, color, image=None, transparent=False):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    nodes = mat.node_tree.nodes; nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    if image:
        shader = nodes.new('ShaderNodeEmission')
        tex = nodes.new('ShaderNodeTexImage'); tex.image = image
        mat.node_tree.links.new(tex.outputs['Color'], shader.inputs['Color'])
    else:
        shader = nodes.new('ShaderNodeBsdfPrincipled')
        shader.inputs['Base Color'].default_value = (*color, 1)
        shader.inputs['Roughness'].default_value = .8
    if image and transparent:
        clear=nodes.new('ShaderNodeBsdfTransparent')
        mix=nodes.new('ShaderNodeMixShader')
        mat.node_tree.links.new(tex.outputs['Alpha'],mix.inputs[0])
        mat.node_tree.links.new(clear.outputs[0],mix.inputs[1])
        # A direct color socket is the exporter-recognized unlit graph.
        # An Emission shader here would lose alpha in the glTF export.
        mat.node_tree.links.new(tex.outputs['Color'],mix.inputs[2])
        mat.node_tree.links.new(mix.outputs[0],output.inputs['Surface'])
        mat.surface_render_method='DITHERED'
    else:
        mat.node_tree.links.new(shader.outputs[0], output.inputs['Surface'])
    return mat

def mesh(name, vertices, faces, mat, uvs=None):
    data = bpy.data.meshes.new(name); data.from_pydata(vertices, [], faces); data.update()
    obj = bpy.data.objects.new(name, data); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    if uvs:
        layer = data.uv_layers.new(name='UVMap')
        for poly in data.polygons:
            for loop in poly.loop_indices: layer.data[loop].uv = uvs[data.loops[loop].vertex_index]
    return obj

def cube(name, at, dimensions, mat, parent=None, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=at)
    obj=bpy.context.object; obj.name=name; obj.dimensions=dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod=obj.modifiers.new('Worn softened edges','BEVEL'); mod.width=bevel; mod.segments=2
        bpy.context.view_layer.objects.active=obj; bpy.ops.object.modifier_apply(modifier=mod.name)
    if parent: obj.parent=parent
    return obj

def setup(name, width, height, scale):
    scene=bpy.context.scene; scene.name=name
    scene.render.engine='CYCLES'; scene.cycles.samples=16
    scene.render.resolution_x=width; scene.render.resolution_y=height; scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.view_settings.view_transform='Standard'
    scene.world=bpy.data.worlds.new(name+' atmosphere'); scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.21,.23,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
    camera=bpy.data.cameras.new(name+' camera'); obj=bpy.data.objects.new(name+' camera',camera)
    scene.collection.objects.link(obj); obj.location=(0,-30,0)
    obj.rotation_euler=(Vector((0,0,0))-obj.location).to_track_quat('-Z','Y').to_euler()
    camera.type='ORTHO'; camera.ortho_scale=scale; camera.clip_end=100
    scene.camera=obj
    light=bpy.data.lights.new('Warm museum softbox','AREA'); light.energy=1100; light.color=(1,.83,.59); light.size=8
    lo=bpy.data.objects.new(light.name,light); scene.collection.objects.link(lo); lo.location=(-3,-8,7)
    lo.rotation_euler=(Vector((0,0,0))-lo.location).to_track_quat('-Z','Y').to_euler()
    return scene

def export(scene, name):
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / (name+'.blend')))
    scene.render.filepath=str(OUT / (name+'-poster.png'))
    bpy.ops.render.render(write_still=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT / (name+'.glb')), export_format='GLB',
        export_cameras=True, export_extras=True, export_lights=False,
        use_active_scene=True, export_apply=True)

# Long-scroll camera mapping. Sculpted depth follows the painted buildings and
# mountains; texture projection keeps the original, fixed composition intact.
hero_image=crop('scroll-art',(330,66,1586,430))
hero_data=np.array(hero_image.pixels[:],dtype=np.float32).reshape(364,1256,4)[::-1].copy()
# Trace the rolled silhouette. Concept typography stays in accessible HTML,
# rather than becoming part of the relief texture beside the rolled edge.
ys=np.arange(66,430)
left_edge=np.interp(ys,[66,78,100,160,240,320,350,378,407,418,430],
                         [445,421,418,400,377,348,333,348,387,451,455])
hero_data[:,:,3]*=np.clip((np.arange(330,1586)[None,:]-left_edge[:,None])/3,0,1)
for x0,y0,x1,y1 in [(551,405,615,430),(720,418,781,430),(878,424,948,430),(1395,420,1475,430)]:
    hero_data[y0-66:y1-66,x0-330:x1-330,3]=0
save_pixels(hero_image,hero_data[::-1])

# Only scenery is retained: the desktop, brush, bronze incense burner and
# defocused branches. Native text and the event link are rendered by the page.
atmosphere=crop('hero-atmosphere',(0,80,1586,596))
atmosphere_data=np.array(atmosphere.pixels[:],dtype=np.float32).reshape(516,1586,4)[::-1].copy()
yy,xx=np.mgrid[80:596,0:1586]
atmosphere_data[:,:,3]*=np.clip((yy-419)/30,0,1)
for x0,y0,x1,y1 in [(54,440,286,499),(1274,449,1586,596),
                     (548,400,620,440),(717,410,786,453),(878,421,953,459),
                     (1043,427,1115,470),(1215,425,1295,468),(1394,414,1479,453)]:
    distance=np.maximum.reduce([x0-xx,xx-x1,y0-yy,yy-y1,np.zeros_like(xx)])
    atmosphere_data[:,:,3]*=np.clip(distance/9,0,1)
save_pixels(atmosphere,atmosphere_data[::-1])
# A small clean section supplies the charcoal texture behind native page text.
crop('ink-texture',(1065,5,1225,72))
crop('floor-atmosphere',(0,944,1586,992))
plant=crop('shelf-plant',(1480,705,1586,944))
plant_data=np.array(plant.pixels[:],dtype=np.float32).reshape(239,106,4)[::-1].copy()
py,px=np.mgrid[705:944,1480:1586]
plant_data[:,:,3]*=np.clip((px-1480)/12,0,1)
plant_data[(px<1530)&(py<845),3]=0
save_pixels(plant,plant_data[::-1])
crop('desk-atmosphere',(0,500,1245,596))
crop('qin-portrait',(1288,465,1370,569))
hero_mat=material('Camera-projected historical painting',None,hero_image,transparent=True)
scene=setup('History scroll relief',1507,437,12)
verts=[];uv=[]; faces=[]; nx=160; nz=54; aspect=1256/364
for row in range(nz+1):
    v=row/nz
    for col in range(nx+1):
        u=col/nx; x=(u-.5)*12; z=(v-.5)*12/aspect
        # The rolled edge, central temples and skyline receive physical depth.
        scroll_roll=.65*math.exp(-((u-.065)/.06)**2)
        ridge=.32*math.sin(u*23)**2*math.sin(v*math.pi)**2
        building=.18*(.5+.5*math.cos(u*72))*math.sin(v*math.pi)**4
        verts.append((x,-scroll_roll-ridge-building,z));uv.append((u,v))
for row in range(nz):
    for col in range(nx):
        a=row*(nx+1)+col;faces.append((a,a+1,a+nx+2,a+nx+1))
relief=mesh('Unfurled scroll · projected landscape relief',verts,faces,hero_mat,uv)
relief['description']='Fixed-view 2.5D relief with camera-mapped concept texture'
relief['era_nodes']='early,qinhan,suitang,songyuan,ming,qing'
export(scene,'history-scroll')

# Five independent, full-thickness book objects, matched to the concept camera.
# Each cover follows its own traced silhouette and original UV projection. This
# avoids stretching already-perspective artwork into thin rectangular books.
bpy.ops.wm.read_factory_settings(use_empty=True)
BOOK_STAGE=(346,610,1372,944)
stage_width,stage_height=BOOK_STAGE[2]-BOOK_STAGE[0],BOOK_STAGE[3]-BOOK_STAGE[1]
scene=setup('History bookshelf',stage_width*2,stage_height*2,stage_width/100)
paper=material('Warm aged page edges',(.30,.23,.14))
wood=material('Dark walnut shelf',(.035,.017,.010))
colors=[(.25,.16,.07),(.045,.075,.065),(.14,.045,.025),(.25,.14,.05),(.035,.06,.10)]
names=['shiji','hanshu','sanguozhi','jiutangshu','qingshigao']
titles=['史记','汉书','三国志','旧唐书','清史稿']

# Keep the woven green cloth and decorative border intact. Only the incorrect
# title area is patched, using neighbouring cloth instead of a flat black fill.
atlas=crop('books-camera-art',BOOK_STAGE)
atlas_pixels=np.array(atlas.pixels[:],dtype=np.float32).reshape(stage_height,stage_width,4)[::-1].copy()
ax,ay=BOOK_STAGE[:2]
left,top,right,bottom=688-ax,673-ay,735-ax,755-ay
cloth=atlas_pixels[670-ay:753-ay,650-ax:684-ax,:3].copy()
target_height,target_width=bottom-top,right-left
cloth=np.tile(cloth,(1,2,1))[:target_height,:target_width]
yy,xx=np.mgrid[0:target_height,0:target_width]
feather=np.minimum.reduce([xx+1,target_width-xx,yy+1,target_height-yy])/5
feather=np.clip(feather,0,1)[...,None]
region=atlas_pixels[top:bottom,left:right,:3]
region[:]=region*(1-feather)+cloth*feather

# The website supplies crisp, accessible labels in this area. Preserve the wood
# grain and carved ends while removing the concept's painted button lettering.
wood_strip=atlas_pixels[875-ay:882-ay,398-ax:1324-ax,:3].copy()
for py in range(883,938):
    grain=wood_strip[(py-883)%len(wood_strip)]
    shade=.84-.18*((py-883)/55)
    atlas_pixels[py-ay,398-ax:1324-ax,:3]=grain*shade
atlas.pixels.foreach_set(atlas_pixels[::-1].copy().ravel())
atlas.save();atlas.unpack(method='USE_ORIGINAL');atlas.reload();atlas.pack()
paint=material('Reference-projected woven covers and carved walnut',None,atlas)

def stage_point(px,py,depth=0):
    return ((px-(BOOK_STAGE[0]+BOOK_STAGE[2])/2)/100,depth,
            ((BOOK_STAGE[1]+BOOK_STAGE[3])/2-py)/100)

def projected_solid(name,outline,depth,thickness,side_mat,parent=None,origin=(0,0,0),face_mat=paint):
    """Extruded silhouette with separate front artwork and real side faces."""
    front=[tuple(a-b for a,b in zip(stage_point(x,y,depth),origin)) for x,y in outline]
    rear=[(x,y+thickness,z) for x,y,z in front]
    count=len(outline)
    sides=[(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    sides.append(tuple(range(count,count*2)))
    solid=mesh(name+' physical thickness',front+rear,sides,side_mat)
    uv=[((x-BOOK_STAGE[0])/stage_width,1-(y-BOOK_STAGE[1])/stage_height) for x,y in outline]
    cover=mesh(name+' camera-mapped front',front,[tuple(reversed(range(count)))],face_mat,uv)
    if parent:solid.parent=parent;cover.parent=parent
    return solid,cover

# The carved ends and broad inset apron belong to the shelf, not a floating bar.
shelf_outline=[(398,842),(425,851),(1318,850),(1341,855),(1353,869),
               (1364,899),(1368,943),(349,943),(349,924),(358,900),
               (367,873),(368,856)]
projected_solid('Carved walnut display plinth',shelf_outline,.02,.85,wood)
cube('Walnut rear support',(0,.56,-1.40),(9.35,.60,.43),wood,bevel=.018)

# Silhouettes include their bindings and natural camera angle. Shiji is larger
# and leans slightly in the source; none of the five cover textures is stretched.
outlines=[
    [(402,643),(421,634),(583,618),(617,859),(610,866),(430,873)],
    [(628,646),(647,643),(780,645),(784,856),(628,859)],
    [(806,646),(824,644),(955,645),(960,855),(807,858)],
    [(982,646),(1002,643),(1133,645),(1136,855),(983,858)],
    [(1157,647),(1176,644),(1302,645),(1307,855),(1158,858)],
]
try:font=bpy.data.fonts.load('C:/Windows/Fonts/simkai.ttf')
except RuntimeError:
    try:font=bpy.data.fonts.load('C:/Windows/Fonts/simsun.ttc')
    except RuntimeError:font=None
title_gold=bpy.data.materials.new('Hanshu faded gold ink');title_gold.use_nodes=True
title_nodes=title_gold.node_tree.nodes;title_nodes.clear()
ink=title_nodes.new('ShaderNodeEmission');ink.inputs['Color'].default_value=(.50,.32,.14,1)
ink_output=title_nodes.new('ShaderNodeOutputMaterial')
title_gold.node_tree.links.new(ink.outputs[0],ink_output.inputs['Surface'])
for i,(name,outline,title) in enumerate(zip(names,outlines,titles)):
    root=bpy.data.objects.new('book-'+name,None);scene.collection.objects.link(root)
    root['book_id']=name;root['title']=title
    root['construction']='Independent extruded binding, paper block and camera-mapped cover'
    center=np.mean(np.array(outline),axis=0)
    origin=stage_point(*center)
    root.location=origin
    body=material(name+' cloth binding',colors[i])
    page_outline=[tuple(center+(np.array(point)-center)*.97) for point in outline]
    projected_solid(name+' page block',page_outline,-.08,.34,paper,root,origin,body)
    projected_solid(name+' fabric cover',outline,-.12,.055,body,root,origin)
    # Separate rear board encloses the paper block; it becomes visible on hover.
    projected_solid(name+' rear board',outline,.285,.055,body,root,origin,body)
    if name=='hanshu':
        for n,char in enumerate(title):
            text=bpy.data.curves.new(name+' title '+str(n),'FONT');text.body=char
            text.size=.38;text.align_x='CENTER';text.extrude=.0008
            if font:text.font=font
            obj=bpy.data.objects.new(text.name,text);scene.collection.objects.link(obj)
            position=stage_point(711,706+n*39,-.125)
            obj.location=tuple(a-b for a,b in zip(position,origin))
            obj.rotation_euler=(math.pi/2,0,0);obj.data.materials.append(title_gold);obj.parent=root
            bpy.context.view_layer.objects.active=obj;obj.select_set(True)
            bpy.ops.object.convert(target='MESH');obj.select_set(False)
export(scene,'history-books')
(OUT/'manifest.json').write_text(json.dumps({'version':1,'source':'Blender 5.2',
    'scroll':{'model':'history-scroll.glb','poster':'history-scroll-poster.png','kind':'camera-mapped relief'},
    'books':{'model':'history-books.glb','poster':'history-books-poster.png','ids':names}},indent=2),encoding='utf-8')
print('HISTORY_ASSETS_READY',OUT)
