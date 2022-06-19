import * as bezql from "bezql";
import ConnectionConfig from "bezql/lib/types/ConnectionConfig";
import CRUDOperation from "bezql/lib/types/CRUDOperation";
import Event from "bezql/lib/types/Event";
import SupportedDatabase from "bezql/lib/types/SupportedDatabase";

export const addConfig = (name:string, config:ConnectionConfig) => {
    bezql.addConfig(name, config);
}

export const removeConfig = async (name:string) => {
    await bezql.removeConfig(name);
}

export const addEventListener = (configName: string, when: "before" | "after", eventType: CRUDOperation, callback:(e:Event)=>Promise<boolean>) => {
    bezql.addEventListener(configName, when, eventType, callback);
}

export const addReservedWord = (dbType: SupportedDatabase, word: string) => {
    bezql.addReservedWord(dbType, word);
}