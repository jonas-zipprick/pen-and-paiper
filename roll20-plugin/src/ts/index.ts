import {on, Message, log, Roll20Object, getAllObjs} from 'roll20-ts';

import {config} from './config.js';

const sendGameState = async () => {
    const state = getAllObjs();
    await fetch([config.backendUrl, 'state'].join('/'), {
        method: "POST",
        body: JSON.stringify(state),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    });
}

class Paiper {
    public async start(): Promise<void> {
        await sendGameState();
        getAllObjs();
        on("chat:message", this.chatMessage.bind(this));
        on("change:graphic", () => sendGameState());
    }

    private chatMessage(msg: Message): void {
        log(JSON.stringify(msg));
    }
}

on("ready", async () => {
    const p = new Paiper();
    await p.start();
});
