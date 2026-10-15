"""Rebuild the five shelf books as articulated, textured opening volumes.

Blender --background --python scripts/blender/build_opening_books.py [-- shiji]
The cover art is mapped by its four front-face corners, not by a screenshot crop.
Printed pages are rendered from the repository's public-domain source paragraphs.
Every page has a physical edge and a bend morph; the GLB contains BookOpen.
"""
import bpy
import json
import math
import sys
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/site/models/opening'
SOURCE = ROOT / 'assets/blender'
PROOF = ROOT / 'artifacts/book-opening'
TEXTURES = SOURCE / 'opening-textures'
for directory in (OUT, SOURCE, PROOF, TEXTURES):
    directory.mkdir(parents=True, exist_ok=True)

BOOKS = {
    'shiji': {'title': '史記', 'corners': [(75,24),(237,8),(264,256),(101,260)], 'color': (.29,.19,.10), 'data': 'shiji/001.json'},
    'hanshu': {'title': '漢書', 'corners': [(301,33),(434,35),(438,246),(302,249)], 'color': (.055,.095,.075), 'data': 'histories/hanshu/001.json'},
    'sanguozhi': {'title': '三國志', 'corners': [(478,34),(609,35),(614,245),(479,248)], 'color': (.20,.07,.043), 'data': 'histories/sanguozhi/001.json'},
    'jiutangshu': {'title': '舊唐書', 'corners': [(656,33),(787,35),(790,245),(657,248)], 'color': (.32,.20,.105), 'data': 'histories/jiutangshu/001.json'},
    'qingshigao': {'title': '清史稿', 'corners': [(830,34),(956,35),(961,245),(831,248)], 'color': (.04,.065,.095), 'data': 'modern/qingshigao/1.json'},
}

def plain(name, color, rough=.85, emission=False):
    material = bpy.data.materials.new(name); material.use_nodes = True
    nodes = material.node_tree.nodes
    shader = nodes.get('Principled BSDF')
    if emission:
        nodes.remove(shader); shader = nodes.new('ShaderNodeEmission')
        shader.inputs['Color'].default_value = (*color,1)
        material.node_tree.links.new(shader.outputs[0],nodes.get('Material Output').inputs['Surface'])
    else:
        shader.inputs['Base Color'].default_value = (*color,1)
        shader.inputs['Roughness'].default_value = rough
    return material

def textured(name, image, unlit=False):
    material = plain(name,(1,1,1),emission=unlit)
    shader = material.node_tree.nodes.get('Emission') if unlit else material.node_tree.nodes.get('Principled BSDF')
    texture = material.node_tree.nodes.new('ShaderNodeTexImage'); texture.image=image
    material.node_tree.links.new(texture.outputs['Color'],shader.inputs['Color' if unlit else 'Base Color'])
    return material

def mesh(name, vertices, faces, materials, uvs=None, parent=None):
    data = bpy.data.meshes.new(name); data.from_pydata(vertices,[],faces); data.update()
    obj = bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj)
    for material in materials: data.materials.append(material)
    if uvs:
        layer = data.uv_layers.new(name='UVMap')
        for polygon in data.polygons:
            for loop in polygon.loop_indices:
                layer.data[loop].uv=uvs[data.loops[loop].vertex_index]
    if parent: obj.parent=parent
    return obj

def cube(name, at, dims, material, parent=None, bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1,location=at)
    obj=bpy.context.object; obj.name=name; obj.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(material)
    if bevel:
        modifier=obj.modifiers.new('Soft worn edge','BEVEL'); modifier.width=bevel; modifier.segments=2
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    if parent: obj.parent=parent
    return obj

def path(name, points, material, radius=.003, parent=None):
    data=bpy.data.curves.new(name,'CURVE'); data.dimensions='3D'; data.bevel_depth=radius; data.bevel_resolution=1
    spline=data.splines.new('POLY'); spline.points.add(len(points)-1)
    for point, xyz in zip(spline.points,points): point.co=(*xyz,1)
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj); data.materials.append(material)
    if parent: obj.parent=parent
    return obj

def text(name, body, at, size, material, font, parent=None):
    data=bpy.data.curves.new(name,'FONT'); data.body=body; data.font=font
    data.size=size; data.align_x='CENTER'; data.align_y='TOP'; data.space_line=1.08
    data.resolution_u=2; data.extrude=0
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj)
    obj.location=at; data.materials.append(material)
    if parent: obj.parent=parent
    return obj

def make_camera(scene, name, position, target, scale):
    data=bpy.data.cameras.new(name); obj=bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj); obj.location=position
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
    data.type='ORTHO'; data.ortho_scale=scale; data.clip_end=100
    scene.camera=obj; return obj

def page_art(identifier, book, side):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene=bpy.context.scene
    scene.render.engine='CYCLES'; scene.cycles.samples=8; scene.cycles.use_denoising=True
    scene.render.resolution_x=640; scene.render.resolution_y=880; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='JPEG'; scene.render.image_settings.color_mode='RGB'
    scene.render.image_settings.quality=89
    scene.view_settings.view_transform='Standard'; scene.view_settings.look='None'
    camera=make_camera(scene,'Printing camera',(0,0,5),(0,0,0),2.2)
    camera.data.sensor_fit='VERTICAL'
    paper=plain('Natural paper fibers',(.84,.78,.65),emission=True)
    nodes=paper.node_tree.nodes; shader=nodes.get('Emission')
    noise=nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=160
    ramp=nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color=(.74,.66,.51,1)
    ramp.color_ramp.elements[1].color=(.89,.83,.69,1)
    paper.node_tree.links.new(noise.outputs['Fac'],ramp.inputs[0]); paper.node_tree.links.new(ramp.outputs[0],shader.inputs['Color'])
    mesh('Full paper face',[(-.8,-1.1,0),(.8,-1.1,0),(.8,1.1,0),(-.8,1.1,0)],[(0,1,2,3)],[paper])
    ink=plain('Printed soot ink',(.075,.057,.036),emission=True)
    rule=plain('Faded frame ink',(.22,.17,.105),emission=True)
    seal=plain('Cinnabar publisher seal',(.43,.064,.029),emission=True)
    font=bpy.data.fonts.load('C:/Windows/Fonts/simkai.ttf')
    text('Printed source title',book['title'],(0,.97,.011),.14,ink,font)
    for inset in (0,.015):
        path('Printed frame',[(-.65+inset,-.84,.01),(.65-inset,-.84,.01),(.65-inset,.75,.01),(-.65+inset,.75,.01),(-.65+inset,-.84,.01)],rule,.002)
    source=json.loads((ROOT/'public/data'/book['data']).read_text('utf-8'))
    blocks=[block for block in source['blocks'] if block['kind']=='paragraph' and len(block['text'])>30 and '<table' not in block['html']]
    body=''.join(block['text'].strip() for block in blocks)
    # Take the text in reading order, retaining traditional characters and punctuation.
    portion=body[side*112:(side+1)*112]
    for column in range(8):
        x=.56-column*.155
        if column<7: path('Traditional column rule',[(x-.075,-.81,.01),(x-.075,.73,.01)],rule,.0008)
        text('Original source column '+str(column),'\n'.join(portion[column*14:(column+1)*14]),(x,.66,.015),.073,ink,font)
    text('Printed volume marker','卷一' if side==0 else '本紀',(0,-.93,.013),.060,rule,font)
    cube('Small vermilion colophon',(-.57,-.955,.005),(.065,.065,.002),seal,bevel=0)
    file=TEXTURES/(identifier+'-page-'+str(side)+'.jpg'); scene.render.filepath=str(file)
    bpy.ops.render.render(write_still=True)
    return file

def attach_animation(data):
    animation=data.animation_data
    if not animation or not animation.action: return
    action=animation.action
    track=animation.nla_tracks.new(); track.name='BookOpen'
    track.strips.new('BookOpen',1,action)
    animation.action=None

def export_animation(scene, identifier):
    # Scene baking preserves shape-key NLA evaluation. NLA_TRACKS in Blender 5.2
    # writes constant zero weight channels although the native scene curls.
    scene.name='BookOpen'; scene.frame_set(1)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(identifier+'.glb')),export_format='GLB',
        export_animations=True,export_animation_mode='SCENE',export_anim_scene_split_object=False,
        export_anim_slide_to_zero=True,export_force_sampling=True,
        export_morph=True,export_morph_reset_sk_data=False,export_extras=True,
        export_cameras=False,export_lights=False,export_apply=False,use_active_scene=True)

def leaf(name, height, front, rear, edge, width=1.55, depth=2.11, parent=None, bend=True):
    # Two faces and the perimeter are all part of one volumetric paper mesh.
    steps=24 if bend else 8; rows=4 if bend else 1; vertices=[]; uv=[]
    for surface in range(2):
        for row in range(rows+1):
            v=row/rows; y=(v-.5)*depth
            for column in range(steps+1):
                u=column/steps; x=.028+u*width
                z=.005*math.sin(math.pi*u)+(0 if surface==0 else -.002)
                vertices.append((x,y,z)); uv.append((u if surface==0 else 1-u,v))
    size=(steps+1)*(rows+1); faces=[]; indexes=[]
    for surface in range(2):
        for row in range(rows):
            for column in range(steps):
                a=surface*size+row*(steps+1)+column; b=a+steps+1
                face=(a,a+1,b+1,b)
                faces.append(face if surface==0 else tuple(reversed(face))); indexes.append(surface)
    ring=list(range(steps+1))+[r*(steps+1)+steps for r in range(1,rows+1)]+list(range(size-2,size-steps-2,-1))+[r*(steps+1) for r in range(rows-1,0,-1)]
    for i,a in enumerate(ring):
        b=ring[(i+1)%len(ring)]; faces.append((a,b,b+size,a+size)); indexes.append(2)
    obj=mesh(name,vertices,faces,[front,rear,edge],uv,parent)
    obj.location.z=height
    for poly,index in zip(obj.data.polygons,indexes):
        poly.material_index=index; poly.use_smooth=index!=2
    if bend:
        obj.shape_key_add(name='Rest')
        curled=obj.shape_key_add(name='PaperCurl')
        for point in curled.data:
            u=(point.co.x-.028)/width
            point.co.x-=.09*math.sin(math.pi*u)
            point.co.z+=.28*math.sin(math.pi*u)
    return obj

def build(identifier, book, art_files):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene=bpy.context.scene; scene.name='Opening '+book['title']
    scene.frame_start=1; scene.frame_end=73; scene.render.fps=24
    scene.render.engine='CYCLES'; scene.cycles.samples=24; scene.cycles.use_denoising=True
    scene.render.resolution_x=1200; scene.render.resolution_y=800; scene.render.resolution_percentage=100
    scene.render.film_transparent=True; scene.render.image_settings.color_mode='RGBA'
    scene.view_settings.view_transform='Standard'; scene.view_settings.look='None'
    world=bpy.data.worlds.new('Soft studio'); world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.4,.43,.45,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.28; scene.world=world
    make_camera(scene,'Opening review camera',(.15,-4.0,5.6),(0,0,.32),4.6)
    for name,loc,power,size in [('Key',(-3,-4,7),280,5),('Fill',(3,1,5),120,4)]:
        data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.size=size
        obj=bpy.data.objects.new(name,data); scene.collection.objects.link(obj); obj.location=loc
        obj.rotation_euler=(Vector((0,0,0))-obj.location).to_track_quat('-Z','Y').to_euler()
    cloth=plain('Worn '+identifier+' cloth',book['color'])
    paper=plain('Warm paper edge',(.77,.69,.53))
    thread=plain('Old linen binding',(.44,.32,.17))
    atlas=bpy.data.images.load(str(ROOT/'public/site/models/history/books-camera-art.png')); atlas.pack()
    cover_art=textured('Original antique cover art',atlas,True)
    images=[bpy.data.images.load(str(file)) for file in art_files]
    for image in images: image.pack()
    print_mats=[textured('Printed source page '+str(i),image) for i,image in enumerate(images)]
    root=bpy.data.objects.new('Book-'+identifier,None); scene.collection.objects.link(root)
    root['book_id']=identifier; root['construction']='Thread-bound cloth boards, physical page edges, articulated curved leaves'
    cube('Lower cloth board',(.80,0,.012),(1.61,2.22,.023),cloth,root,.012)
    # The individual outer edges remain visible as the cover opens.
    for index in range(28):
        z=.029+index*.0028
        leaf('Bound paper edge '+str(index),z,paper,paper,paper,parent=root,bend=False)
    cube('Flexible sewn spine',(.016,0,.079),(.041,2.13,.12),cloth,root,.015)
    final=leaf('Printed right reading page',.112,print_mats[1],paper,paper,parent=root,bend=False)
    final['source']=book['data']
    for index in range(4):
        sheet=leaf('Turning printed leaf '+str(index),.122+index*.003,print_mats[index%2],print_mats[(index+1)%2],paper,parent=root)
        # Higher sheets turn first; each has a changing physical curvature.
        start=20+(3-index)*9; end=start+24
        for frame,angle,bend in [(1,0,0),(start,0,0),(start+7,-58,.8),(start+14,-124,1),(end,-178+index*.6,0),(73,-178+index*.6,0)]:
            sheet.rotation_euler.y=math.radians(angle)
            sheet.keyframe_insert(data_path='rotation_euler',frame=frame)
            sheet.data.shape_keys.key_blocks['PaperCurl'].value=bend
            sheet.data.shape_keys.key_blocks['PaperCurl'].keyframe_insert(data_path='value',frame=frame)
        attach_animation(sheet); attach_animation(sheet.data.shape_keys)
    hinge=bpy.data.objects.new('Front cover hinge',None); scene.collection.objects.link(hinge)
    hinge.parent=root; hinge.location=(0,0,.147)
    cube('Front cloth board',(.8,0,0),(1.61,2.22,.016),cloth,hinge,.012)
    tl,tr,br,bl=book['corners']
    equations=[]; values=[]
    for (u,v),(px,py) in zip([(0,0),(1,0),(1,1),(0,1)],[bl,br,tr,tl]):
        equations += [[u,v,1,0,0,0,-px*u,-px*v],[0,0,0,u,v,1,-py*u,-py*v]]
        values += [px,py]
    a,b,c,d,e,f,g,h=np.linalg.solve(np.array(equations),np.array(values))
    vertices=[]; uv=[]; faces=[]; steps=20
    for row in range(steps+1):
        v=row/steps
        for col in range(steps+1):
            u=col/steps; denominator=g*u+h*v+1
            px=(a*u+b*v+c)/denominator; py=(d*u+e*v+f)/denominator
            vertices.append((1.6*u,2.2*(v-.5),.009)); uv.append((px/1026,1-py/334))
    for row in range(steps):
        for col in range(steps):
            index=row*(steps+1)+col
            faces.append((index,index+1,index+steps+2,index+steps+1))
    mesh('Undistorted textured front cover',vertices,faces,[cover_art],uv,hinge)
    # Endpaper carries actual source print rather than product branding.
    mesh('Printed front endpaper',[(.03,-1.06,-.009),(1.57,-1.06,-.009),(1.57,1.06,-.009),(.03,1.06,-.009)],[(3,2,1,0)],[print_mats[0]],[(1,0),(0,0),(0,1),(1,1)],hinge)
    if identifier=='hanshu':
        font=bpy.data.fonts.load('C:/Windows/Fonts/simkai.ttf')
        gold=plain('Faded gold title ink',(.55,.37,.18),emission=True)
        text('Canonical shelf title','汉\n书',(.84,.60,.014),.32,gold,font,hinge)
    for y in (-.73,-.25,.25,.73):
        path('Visible sewn binding stitch',[(.11,y-.027,.160),(-.012,y,.160),(-.025,y,.01),(.12,y+.026,.011)],thread,.0045,root)
        path('Front folded thread',[(.045,y-.023,.012),(.11,y,.012),(.045,y+.023,.012)],thread,.0035,hinge)
    for frame,angle in [(1,0),(10,0),(24,-62),(39,-146),(49,-181),(73,-184)]:
        hinge.rotation_euler.y=math.radians(angle); hinge.keyframe_insert(data_path='rotation_euler',frame=frame)
    attach_animation(hinge)
    # Curves/fonts become ordinary glTF meshes; the bend keys remain on sheets.
    for obj in list(scene.objects):
        if obj.type in ('FONT','CURVE'):
            bpy.context.view_layer.objects.active=obj; obj.select_set(True)
            bpy.ops.object.convert(target='MESH'); obj.select_set(False)
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/('opening-'+identifier+'.blend')))
    export_animation(scene,identifier)
    for frame,label in [(1,'closed'),(36,'turning'),(73,'open')]:
        scene.frame_set(frame); scene.render.image_settings.file_format='PNG'
        scene.render.filepath=str(PROOF/(identifier+'-'+label+'.png'))
        bpy.ops.render.render(write_still=True)
    return {'model':identifier+'.glb','animation':'BookOpen','durationSeconds':3,'sourceText':book['data'],
            'editableSource':'assets/blender/opening-'+identifier+'.blend',
            'construction':'real volume; four articulated paper leaves with curl morphs; textured sewn covers',
            'bytes':(OUT/(identifier+'.glb')).stat().st_size}

selection=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
export_only='--export-only' in selection
selection=[item for item in selection if item!='--export-only']
manifest_path=OUT/'manifest.json'
manifest=json.loads(manifest_path.read_text('utf-8')) if manifest_path.exists() else {'version':1,'books':{}}
for identifier, book in BOOKS.items():
    if selection and identifier not in selection: continue
    if export_only:
        bpy.ops.wm.open_mainfile(filepath=str(SOURCE/('opening-'+identifier+'.blend')))
        export_animation(bpy.context.scene,identifier)
        manifest['books'][identifier]['bytes']=(OUT/(identifier+'.glb')).stat().st_size
        print('OPENING_BOOK_REEXPORTED',identifier,flush=True)
        continue
    files=[page_art(identifier,book,side) for side in range(2)]
    manifest['books'][identifier]=build(identifier,book,files)
    print('OPENING_BOOK_READY',identifier,manifest['books'][identifier]['bytes'],flush=True)
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
