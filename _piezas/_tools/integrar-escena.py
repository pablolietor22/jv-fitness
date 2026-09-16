# integrar-escena.py <showcase.html> <pieza.html> <N> "<TITULO>" <ancla>
#   Pega la pieza VERBATIM entre marcadores  <!-- ============ ESCENA N DEL VIAJE ASTRAL . TITULO ============ -->
#   ... <!-- ============ FIN ESCENA N ============ -->  justo DESPUES de la linea <ancla> (fragmento exacto, unico).
#   Respeta el CRLF del showcase. .BAK con sello antes de tocar. Si la escena N ya existe, no hace nada.
import sys, io, shutil, datetime
showcase, pieza, n, titulo, ancla = sys.argv[1:6]
raw = open(showcase, 'rb').read()
crlf = b'\r\n' in raw
txt = raw.decode('utf-8').replace('\r\n', '\n')
ini = f'<!-- ============ ESCENA {n} DEL VIAJE ASTRAL . {titulo} ============ -->'
fin = f'<!-- ============ FIN ESCENA {n} ============ -->'
if ini in txt:
    print(f'ESCENA {n} ya esta en el showcase: no toco nada'); sys.exit(0)
if txt.count(ancla) != 1:
    print(f'el ancla aparece {txt.count(ancla)} veces (esperaba 1): NO TOCO'); sys.exit(1)
cuerpo = open(pieza, 'rb').read().decode('utf-8').replace('\r\n', '\n').rstrip('\n')
bloque = f'{ancla}\n{ini}\n{cuerpo}\n{fin}\n'
nuevo = txt.replace(ancla + '\n', bloque, 1)
sello = datetime.datetime.now().strftime('%Y%m%d-%H%M')
shutil.copyfile(showcase, f'{showcase}.BAK-{sello}-pre-escena{n}')
out = nuevo.replace('\n', '\r\n') if crlf else nuevo
open(showcase, 'wb').write(out.encode('utf-8'))
print(f'ESCENA {n} pegada tras el ancla · +{len(cuerpo.encode("utf-8"))} B · CRLF={crlf} · marcadores: {nuevo.count(ini)}/{nuevo.count(fin)}')
