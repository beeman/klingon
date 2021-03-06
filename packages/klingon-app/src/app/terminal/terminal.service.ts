import { CliService } from './../cli/cli.service';
import { Injectable } from '@angular/core';

export interface Terminal {
  _initialized: boolean;
  textarea: HTMLTextAreaElement;
  colors: string[];
  theme: string;
  convertEol: boolean;
  termName: string;
  geometry: number[];
  cursorBlink: boolean;
  cursorStyle: string;
  visualBell: boolean;
  popOnBell: boolean;
  scrollback: number;
  screenKeys: boolean;
  debug: boolean;
  cancelEvents: boolean;
  disableStdin: boolean;
  useFlowControl: boolean;
  tabStopWidth: number;
  on(event: string, callbakck: Function);
  open(container: HTMLElement, focus: boolean);
  fit();
  proposeGeometry();
  attach(socket: WebSocket);
  writeln(message: string);
  write(message: string);
  send(data: string);
  clear();
};

interface CommandResult {
  stderr: string;
  stdout: string;
}

@Injectable()
export class TerminalService {

  term: Terminal;
  pid: number;
  socketURL: string;
  socket: WebSocket;

  constructor(
    public cli: CliService
  ) {
    this.cli.runCommand('ng -v')
      .subscribe( (data: CommandResult) => console.log(data.stdout || data.stderr))
  }

  async createTerminal(terminalContainer: HTMLElement) {

    return new Promise( async(resolve, reject) => {

    this.term = new (window as any).Terminal({
      cursorBlink: true,
      debug: true
    });
    this.term.on('resize', (size) => {
      if (!this.pid) {
        return;
      }
      const cols = size.cols;
      const rows = size.rows;
      const url = `http://localhost:3000/terminals/${this.pid}/size?cols=${cols}&rows=${rows}`;

      fetch(url, { method: 'POST' });
    });

    this.socketURL = `ws://localhost:3000/terminals`;

    this.term.open(terminalContainer, false);
    this.term.fit();

    const initialGeometry = this.term.proposeGeometry();
    const cols = 180;
    const rows = 50;

    const res = await fetch(`http://localhost:3000/terminals?cols=${cols}&rows=${rows}`, {
      method: 'POST'
    });

    const pid = await res.text();
    this.socket = new WebSocket(`${this.socketURL}/${pid}`);
    this.socket.onopen = () => {
      this.term.attach(this.socket);
      this.term._initialized = true;
      setTimeout(_ => resolve(), 100);
    };
    this.socket.onclose = this.socketError;
    this.socket.onerror = this.socketError;
    });
  }

  socketError() {
  }

  on(event, callback) {
    this.term.on(event, callback);
  }

  send(data) {
    this.term.clear();
    this.term.send(`${data}\n`);
  }

  write(data) {
    this.term.write(data);
  }

  stop() {
    this.term.send('\x03');
  }

}
