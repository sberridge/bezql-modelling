import * as bezql from "bezql";
import ConnectionConfig from "./types/ConnectionConfig";
import CRUDOperation from "./types/CRUDOperation";
import Event from "./types/Event";
import SupportedDatabase from "./types/SupportedDatabase";

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

export { default as BaseModel } from './classes/BaseModel';