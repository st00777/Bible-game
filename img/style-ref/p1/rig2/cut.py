import subprocess, json, os, re
M='work/L-base.png'; OUT='rig2/parts'; os.makedirs(OUT,exist_ok=True)
POLY={ # 母圖座標 460x768，多邊形彼此重疊，畫序決定誰蓋誰
 'head':[(150,45),(310,45),(310,190),(270,215),(190,215),(150,190)],
 'torso':[(165,195),(295,195),(302,240),(294,365),(166,365),(158,240)],
 'uarmL':[(150,195),(186,203),(182,250),(180,345),(104,345),(104,262),(140,205)],
 'farmL':[(104,318),(180,318),(178,410),(152,480),(106,480),(98,410)],
 'uarmR':[(310,195),(274,203),(278,250),(280,345),(356,345),(356,262),(320,205)],
 'farmR':[(280,318),(356,318),(362,410),(354,480),(308,480),(282,410)],
 'skirt':[(185,322),(275,322),(312,400),(362,640),(346,656),(114,656),(98,640),(148,400)],
 'bootL':[(148,630),(228,630),(228,738),(148,738)],
 'bootR':[(236,630),(312,630),(312,742),(236,742)],
}
CLOAK={ # 來源 work/S-cloakdown-<色>.png，同一畫布
 'hoodback':[(150,180),(310,180),(310,242),(150,242)],
 'cloakU':[(60,232),(400,232),(400,392),(60,392)],
 'cloakL':[(40,345),(420,345),(420,720),(40,720)],
}
def cut(src,name,poly,outname):
    pts=' '.join(f'{x},{y}' for x,y in poly)
    mask=f'{OUT}/_mask.png'
    subprocess.run(['magick','-size','460x768','xc:black','-fill','white','-draw',f'polygon {pts}',mask],check=True)
    tmp=f'{OUT}/_tmp.png'
    subprocess.run(['magick',src,'(',mask,'-alpha','off',')','-compose','CopyOpacity','-composite',tmp],check=True)
    # 母圖自己的 alpha 也要保留：用 multiply 合併兩個 alpha
    subprocess.run(['magick',src,'-alpha','extract',mask,'-compose','multiply','-composite',f'{OUT}/_a.png'],check=True)
    subprocess.run(['magick',src,'-alpha','off',f'{OUT}/_a.png','-alpha','off','-compose','CopyOpacity','-composite',tmp],check=True)
    bbox=subprocess.run(['magick',tmp,'-alpha','extract','-threshold','1%','-format','%@','info:'],capture_output=True,text=True).stdout.strip()
    w,h,x,y=map(int,re.match(r'(\d+)x(\d+)\+(\d+)\+(\d+)',bbox).groups())
    subprocess.run(['magick',tmp,'-crop',f'{w}x{h}+{x}+{y}','+repage',f'{OUT}/{outname}.png'],check=True)
    subprocess.run(['cwebp','-quiet','-q','88','-alpha_q','90',f'{OUT}/{outname}.png','-o',f'{OUT}/{outname}.webp'],check=True)
    return {'x':x,'y':y,'w':w,'h':h}
meta={}
for n,p in POLY.items(): meta[n]=cut(M,n,p,n)
for c in ['purple','oat','blue']:
    for n,p in CLOAK.items(): meta[f'{n}-{c}']=cut(f'work/S-cloakdown-{c}.png',n,p,f'{n}-{c}')
for f in ['_mask.png','_tmp.png','_a.png']: os.remove(f'{OUT}/{f}')
json.dump(meta,open('rig2/parts.json','w'),indent=1)
# 驗證：靜止姿勢疊回去跟母圖比
order=['bootL','bootR','skirt','torso','uarmL','farmL','uarmR','farmR','head']
cmd=['magick','-size','460x768','xc:none']
for n in order: cmd+=[f'{OUT}/{n}.png','-geometry',f"+{meta[n]['x']}+{meta[n]['y']}",'-composite']
cmd.append('rig2/reassembled.png'); subprocess.run(cmd,check=True)
r=subprocess.run(['magick','compare','-metric','AE','-fuzz','2%','rig2/reassembled.png',M,'null:'],capture_output=True,text=True)
print('AE diff pixels vs master:',r.stderr.strip())
subprocess.run(['magick','rig2/reassembled.png',M,'-compose','difference','-composite','-auto-level','rig2/diff.png'])
print(json.dumps(meta))
