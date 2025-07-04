from flask import Flask, jsonify, request, url_for, render_template
import os  # Asegúrate de que este módulo esté importado
import platform  # Asegúrate de importar el módulo platform

app = Flask(__name__)

# Lista inicial de direcciones IP
#ips = ["8.8.8.8", "192.168.1.1"]
ips = []

def ping(ip):
    # Detectar el sistema operativo
    param = '-n' if platform.system().lower() == 'windows' else '-c'

    # Ejecutar el comando ping
    response = os.system(f"ping {param} 1 {ip} >nul 2>&1")
    return response == 0

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/status')
def status():
    results = {}
    for ip in ips:
        results[ip] = ping(ip)
    return jsonify(results)

@app.route('/ips', methods=['GET', 'POST', 'DELETE'])
def manage_ips():
    global ips

    if request.method == 'POST':
        new_ip = request.json.get('ip')
        if new_ip and new_ip not in ips:
            ips.append(new_ip)
            return jsonify({
                'message': 'IP agregada',
                'ip': new_ip,        # <- la IP agregada
                'ips': ips
			}), 201

    elif request.method == 'DELETE':
        ip_to_remove = request.json.get('ip')
        if ip_to_remove in ips:
            ips.remove(ip_to_remove)
            return jsonify({
                'message': 'IP removida',
                'ip': ip_to_remove,
                'ips': ips
            }), 200

    return jsonify({'ips': ips})

@app.route('/statistics', methods=['GET'])
def statistics():
    global ips

    # Simula la recuperación del estado de las IPs
    statuses = {ip: ping(ip) for ip in ips}

    # Conteo de estados
    available_count = sum(statuses.values())
    unavailable_count = len(statuses) - available_count

    return jsonify({
        'available': available_count,
        'unavailable': unavailable_count
    })

if __name__ == '__main__':
    app.run(debug=True)

