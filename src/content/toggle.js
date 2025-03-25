// ---------- Toggle ---------------------------------------
export class Toggle {

  static password(elem) {
    elem.addEventListener('click', () => {
      const input = elem.previousElementSibling;
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  }
}