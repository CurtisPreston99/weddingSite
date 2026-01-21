import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Envelope } from './envelope/envelope';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,Envelope],
  templateUrl: './app.html',
  styleUrl: './app.less'
})
export class App {
  opened = false;

  protected readonly title = signal('wedding2');

  envelopedOpened(isOpen: boolean) {
    this.log('App detected envelope state change: ' + isOpen);
    this.opened = isOpen;
  }

  log(msg: any) {
    console.log(msg);
  }
}
