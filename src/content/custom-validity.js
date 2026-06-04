// ---------- set custom validity --------------------------
export class CustomValidity {

  static set(elem, message) {
    elem.scrollIntoView({block: 'center'});
    elem.setCustomValidity(message);
    elem.reportValidity();
  }

  // clear previously set setCustomValidity
  static clear(elem) {
    Array.isArray(elem) || (elem = [elem]);
    elem.forEach(i => i.setCustomValidity(''));
  }
}