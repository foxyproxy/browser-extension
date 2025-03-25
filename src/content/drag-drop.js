// ---------- Drag and Drop (Side Effect) ------------------
class Drag {

  static {
    this.proxyDiv = document.querySelector('div.proxy-div');
    this.proxyDiv.addEventListener("dragstart", e => this.dragstart(e));
    this.proxyDiv.addEventListener('dragover', e => this.dragover(e));
    this.proxyDiv.addEventListener('dragend', e => this.dragend(e));
    this.target = null;
  }

  static dragstart(e) {
    if (e.target.localName === 'input') {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  static dragover(e) {
    this.target = e.target.closest('details');
  }

  static dragend(e) {
    if (!this.target) { return; }

    const arr = [...this.proxyDiv.children];
    arr.indexOf(e.target) > arr.indexOf(this.target) ? this.target.before(e.target) : this.target.after(e.target);
    this.target = null;
  }
}