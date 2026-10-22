"""Build and render the school solenoid model in Blender 5.x.

Run: blender --background --python art-source/create_solenoid.py
Authored Z-up here, exported glTF Y-up. X is the solenoid axis in both.
"""
import bpy
import math
from mathutils import Vector
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'site/assets/models'
ART = ROOT / 'art-source'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def material(name, color, metallic=0, roughness=.35):
    mat=bpy.data.materials.new(name)
    mat.diffuse_color=(*color,1)
    mat.use_nodes=True
    shader=mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(*color,1)
    shader.inputs['Metallic'].default_value=metallic
    shader.inputs['Roughness'].default_value=roughness
    return mat

copper=material('Copper enamel',(.50,.205,.073),.78,.25)
ivory=material('Warm ceramic',(.76,.76,.61),.06,.28)
sage=material('Deep sage powder coat',(.075,.135,.109),.18,.36)
brass=material('Brass hardware',(.43,.31,.11),.8,.28)
steel=material('Brushed iron',(.25,.31,.285),.82,.35)
rubber=material('Rubber feet',(.023,.034,.028),0,.68)
red=material('Positive terminal',(.41,.115,.065),.05,.3)
black=material('Negative terminal',(.025,.041,.035),.05,.4)
groove=material('Core end grooves',(.08,.12,.105),.6,.32)

objects=[]
def finish(obj,name,mat,bevel=0):
    obj.name=name
    if mat:obj.data.materials.append(mat)
    if bevel:
        mod=obj.modifiers.new('Machined edge bevel','BEVEL');mod.width=bevel;mod.segments=3
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    if obj.type=='MESH':
        for p in obj.data.polygons:p.use_smooth=True
        mod=obj.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
        mod.keep_sharp=True
        bpy.context.view_layer.objects.active=obj
        try:bpy.ops.object.modifier_apply(modifier=mod.name)
        except RuntimeError: pass
    objects.append(obj)
    return obj

def cube(name,loc,scale,mat,bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    obj=bpy.context.object;obj.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(obj,name,mat,bevel)

def cyl(name,loc,r,depth,mat,axis='Z',bevel=.025,vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc)
    obj=bpy.context.object
    if axis=='X':obj.rotation_euler[1]=math.pi/2
    return finish(obj,name,mat,bevel)

def tube(name,x0,x1,outer,inner,mat,segments=64,bevel=.012):
    verts=[]
    for x,r in [(x0,outer),(x1,outer),(x0,inner),(x1,inner)]:
        verts += [(x,r*math.sin(2*math.pi*i/segments),r*math.cos(2*math.pi*i/segments)) for i in range(segments)]
    faces=[]
    for i in range(segments):
        j=(i+1)%segments
        faces += [(i,j,segments+j,segments+i), (2*segments+i,3*segments+i,3*segments+j,2*segments+j), (i,2*segments+i,2*segments+j,j), (segments+i,segments+j,3*segments+j,3*segments+i)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    return finish(obj,name,mat,bevel)

def wire(name,points,mat,radius=.055):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D'
    curve.resolution_u=1;curve.bevel_depth=radius;curve.bevel_resolution=2;curve.use_fill_caps=True
    if name.startswith('Lead'):
        curve.resolution_u=12
        spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
        for p,co in zip(spline.bezier_points,points):
            p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    else:
        poly=curve.splines.new('POLY');poly.points.add(len(points)-1)
        for p,co in zip(poly.points,points):p.co=(*co,1)
    obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bpy.ops.object.convert(target='MESH');obj=bpy.context.object;obj.select_set(False)
    return finish(obj,name,mat)

base=cube('Base',(0,0,-1.145),(5.9,1.65,.19),sage,.095)
base['description']='Nonmagnetic support base; top at Three.js y=-1.05'
for ix,x in enumerate([-2.45,2.45]):
    for iy,y in enumerate([-.58,.58]):
        cyl(f'Foot{ix}{iy}',(x,y,-1.29),.16,.12,rubber,bevel=.02,vertices=24)
        cyl(f'BaseScrew{ix}{iy}',(x,y,-1.045),.055,.025,brass,bevel=.006,vertices=24)
        cube(f'ScrewSlot{ix}{iy}',(x,y,-1.03),(.066,.012,.008),black,.003)

# A thin-walled ceramic former supports the winding. Ends remain open.
tube('Bobbin',-2.16,2.16,.655,.51,ivory,bevel=.01)
tube('FlangeLeft',-2.24,-2.12,.83,.51,ivory,bevel=.026)
tube('FlangeRight',2.12,2.24,.83,.51,ivory,bevel=.026)
for side,x in [('Left',-2.18),('Right',2.18)]:
    cube('Support'+side,(x,0,-.91),(.28,.73,.28),ivory,.055)

# 12 symbolic turns. The browser replaces this with a count-dependent mesh.
turns=12
points=[]
for i in range(turns*40+1):
    t=i/(turns*40);a=2*math.pi*turns*t
    points.append((-2.1+4.2*t,-.73*math.sin(a),.73*math.cos(a)))
coil=wire('Coil',points,copper)
coil['symbolic_turns']=12
coil['display_windings']=400

# Short, insulated lead wires run around the end flange to binding posts.
for side,x,mat in [('Left',-2.66,black),('Right',2.66,red)]:
    cyl('TerminalBase'+side,(x,-.5,-.96),.135,.13,black,bevel=.02,vertices=32)
    cyl('TerminalMetal'+side,(x,-.5,-.82),.065,.19,brass,bevel=.014,vertices=32)
    cyl('TerminalCap'+side,(x,-.5,-.74),.11,.12,mat,bevel=.024,vertices=32)
    # A gently curved cable, separate from the winding for dynamic replacement.
    sx=-2.1 if side=='Left' else 2.1
    sign=-1 if side=='Left' else 1
    wire('Lead'+side,[(sx,0,.73),(sx+sign*.25,-.16,.78),(sx+sign*.4,-.63,.48),(x,-.68,-.35),(x,-.5,-.76)],copper,.04)

moving=bpy.data.objects.new('IronCoreAssembly',None);bpy.context.collection.objects.link(moving)
core=cyl('IronCore',(0,0,0),.45,5.1,steel,axis='X',bevel=.035,vertices=64)
core.parent=moving
for side,x in [('Left',-2.51),('Right',2.51)]:
    ring=tube('CoreEdge'+side,x-.012,x+.012,.451,.435,groove,segments=48,bevel=.003)
    ring.parent=moving

# Store the mechanically useful insertion motion as a real Blender action.
scene.frame_start=1;scene.frame_end=45
moving.location=(5.8,0,0);moving.keyframe_insert(data_path='location',frame=1)
moving.location=(0,0,0);moving.keyframe_insert(data_path='location',frame=45)
if moving.animation_data and moving.animation_data.action:
    moving.animation_data.action.name='InsertCore'
scene.frame_set(45)

# Export only the apparatus, no lights, cameras, or preview floor.
bpy.ops.object.select_all(action='DESELECT')
for obj in objects+[moving]:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'solenoid-v2.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_apply=True,export_materials='EXPORT',export_extras=True)

# A reproducible studio preview, retained in .blend but not in the web asset.
floor=cube('PreviewFloor',(0,0,-1.39),(200,200,.03),material('Preview background',(.105,.16,.13),0,.8),.01)
world=bpy.data.worlds.new('StudioWorld');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.23,.29,.22,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.5
def area(name,loc,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=loc
    ob.rotation_euler=(Vector((0,0,0))-ob.location).to_track_quat('-Z','Y').to_euler()
area('Warm key',(1,-5,7),1100,6,(1,.86,.65))
area('Cool fill',(-5,3,4),850,5,(.7,.83,1))
area('Edge strip',(4,4,3),1000,4,(.86,1,.85))
data=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',data);bpy.context.collection.objects.link(cam)
cam.location=(7.6,-10.5,5.5);cam.rotation_euler=(Vector((0,0,-.3))-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=9.5;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.resolution_x=1400;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ART/'solenoid-preview-v2.png')
scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'solenoid-apparatus-v2.blend'))
bpy.ops.render.render(write_still=True)
print(json.dumps({'glb':str(OUT/'solenoid-v2.glb'),'bytes':(OUT/'solenoid-v2.glb').stat().st_size,'meshNames':[o.name for o in objects],'animation':'InsertCore','coreParent':'IronCoreAssembly'}))
