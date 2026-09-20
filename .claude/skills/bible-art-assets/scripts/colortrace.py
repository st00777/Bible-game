import sys, re, subprocess, os, shutil
src, out, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
W = subprocess.check_output(['magick','identify','-format','%w',src]).decode()
H = subprocess.check_output(['magick','identify','-format','%h',src]).decode()
shutil.rmtree('ct', ignore_errors=True); os.mkdir('ct')
subprocess.check_call(['magick',src,'-dither','None','-colors',str(n),'-depth','8','ct/q.png'])
hist = subprocess.check_output(['magick','ct/q.png','-format','%c','histogram:info:-']).decode()
rows = []
for line in hist.splitlines():
    m = re.search(r'^\s*(\d+):.*?#([0-9A-Fa-f]{6})', line)
    if m: rows.append((int(m.group(1)), m.group(2).upper()))
rows.sort(reverse=True)
paths = []
for i,(cnt,c) in enumerate(rows):
    subprocess.check_call(['magick','ct/q.png','-fill','white','+opaque','#'+c,'-fill','black','-opaque','#'+c,'-threshold','50%',f'ct/m{i}.pbm'])
    subprocess.check_call(['potrace',f'ct/m{i}.pbm','-s','-t','3','-a','1.2','-O','0.4','-o',f'ct/p{i}.svg'])
    s = open(f'ct/p{i}.svg').read()
    g = re.search(r'<g transform="([^"]+)"', s).group(1)
    for d in re.findall(r'<path d="(.*?)"/>', s, re.S):
        paths.append(f'<path fill="#{c}" d="{" ".join(d.split())}"/>')
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><g transform="{g}" fill-rule="evenodd">\n' + '\n'.join(paths) + '\n</g></svg>\n'
open(out,'w').write(svg)
print('colors', len(rows), 'paths', len(paths), 'bytes', len(svg))
