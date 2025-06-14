import "@types/roll20-ts";

interface State {
    Paiper: PaiperState;
}

class Paiper {
    constructor() {

    }

    public listen(): void {
        on("chat:message", this.handleInput.bind(this));
    }

    private handleInput(msg: Message): void {
        console.log(JSON.stringify(msg));
    }
}

interface PaiperState {
}

on("ready", () => {
    const p = new Paiper();
    p.listen();
});
