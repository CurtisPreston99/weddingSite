import { Component, HostBinding, output } from '@angular/core';

@Component({
  selector: 'app-envelope',
  imports: [],
  templateUrl: './envelope.html',
  styleUrl: './envelope.less',
})
export class Envelope {
  @HostBinding('class.openEnvelope')
  isOpen = false;
  changed = output<boolean>({alias: 'opened'});

  toggleEnvelope() {
    this.isOpen = !this.isOpen;
    this.changed.emit(this.isOpen);

    console.log('Envelope state changed:', this.isOpen);
  }


}
