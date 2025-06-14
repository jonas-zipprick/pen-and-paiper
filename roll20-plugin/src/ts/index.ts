import {on, Message, log, Roll20Object, getAllObjs} from 'roll20-ts';

class Paiper {
    public start(): void {
        getAllObjs();
        on("chat:message", this.chatMessage.bind(this));
        on("change:graphic", this.changeGraphic.bind(this));
    }

    private chatMessage(msg: Message): void {
        log(JSON.stringify(msg));
    }

    private changeGraphic(obj: Roll20Object): void {
        log(JSON.stringify(obj));
        log(getAllObjs());
    }
}

on("ready", () => {
    const p = new Paiper();
    p.start();
});
