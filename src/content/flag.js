// ---------- Unicode flag ---------------------------------
export class Flag {

   static get(cc) {
    cc = /^[A-Z]{2}$/i.test(cc) && cc.toUpperCase();
    return cc ? String.fromCodePoint(...[...cc].map(i => i.charCodeAt() + 127397)) : '🌎';
  }

  static show(item) {
    switch (true) {
      case !!item.cc:
        return this.get(item.cc);

      case item.type === 'direct':
        return '⮕';

      case this.isLocal(item.hostname):
        return '🖥️';

      default:
        return '🌎';
    }
  }

  static isLocal(host) {
    // check local network
    const isIP = /^[\d.:]+$/.test(host);
    switch (true) {
      // --- localhost & <local>
      // case host === 'localhost':
      // plain hostname (no dots)
      case !host.includes('.'):
      // *.localhost
      case host.endsWith('.localhost'):

      // --- IPv4
      // case host === '127.0.0.1':
      // 127.0.0.1 up to 127.255.255.254
      case isIP && host.startsWith('127.'):
      // 169.254.0.0/16 - 169.254.0.0 to 169.254.255.255
      case isIP && host.startsWith('169.254.'):
      // 192.168.0.0/16 - 192.168.0.0 to 192.168.255.255
      case isIP && host.startsWith('192.168.'):

      // --- IPv6
      // case host === '[::1]':
      // literal IPv6 [::1]:80 with/without port
      case host.startsWith('[::1]'):
      // literal IPv6 [FE80::]/10
      case host.toUpperCase().startsWith('[FE80::]'):
        return true;
    }
  }
}