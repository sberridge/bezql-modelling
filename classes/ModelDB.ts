import * as bezql from "bezql";
import QueryConstraints from "./QueryConstraints";
import SQLResult from "./SQLResult";
import WeightedCondition from "./WeightedCondition";
import iPagination from "./../interfaces/iPagination";
import pSQL from "./../interfaces/pSQL";
import Comparator from "./../types/Comparator";
import mSQL from "./../interfaces/mSQL";
import BaseModel from "./BaseModel";
import ModelCollection from "./ModelCollection";

export default class ModelDB implements mSQL {
    private dbHandler:ModelDB;
    private modelFunc?: new (...args: any[]) => BaseModel;
    private configName:string;
    private selectColumns: string[] = ["*"];
    private additionalColumns: string[] = [];

    public constructor(configName:string) {
        const db = bezql.startQuery(configName);
        if(!db) {
            throw "Database not found";
        }
        this.configName = configName;
        this.dbHandler = db as ModelDB;
    }

    public beginTransaction(): Promise<boolean> {
        return this.dbHandler.beginTransaction();
    }

    public commit(): Promise<boolean> {
        return this.dbHandler.commit();
    }

    public rollback(): Promise<boolean> {
        return this.dbHandler.rollback();
    }

    public raw(query: string, params: any): Promise<SQLResult> {
        return this.raw(query, params);
    }

    private resultToModel(result:{[key:string]:any}):BaseModel | null {
        if(!this.modelFunc) {
            return null;
        }
        var model:BaseModel = new this.modelFunc();
        if(!model.getSqlConfig() && this.configName) {
            model.setSqlConfig(this.configName);
        }
        this.additionalColumns.forEach((field)=>{
            if(field in result) {
                model.setAdditionalColumn(field,result[field]);
            }                        
        });
        model.setVisibleColumns(Object.keys(result));
        model.loadData(result);
        return model;
    }

    public toModel(model: new (...args: any[]) => BaseModel) : ModelDB {
        this.modelFunc = model;
        return this;
    }

    public newQuery(): pSQL {
        return this.dbHandler.newQuery();
    }

    public table(tableName: ModelDB, tableAlias: string): ModelDB;
    public table(tableName: string): ModelDB;
    public table(tableName: ModelDB | string, tableAlias?: string | undefined): ModelDB {
        if(typeof tableName == "string") {
            this.dbHandler.table(tableName);
        } else if(typeof tableName !== "string" && typeof tableAlias === "string") {
            this.dbHandler.table(tableName, tableAlias);
        }
        
        return this;
    }

    public cols(columns: string[]): ModelDB {
        this.selectColumns = columns;
        return this;
    }

    public addCol(column:string) : ModelDB {
        this.selectColumns.push(column);
        var colSplit = column.split(/ |\./);
        this.additionalColumns.push(colSplit[colSplit.length-1]);
        return this;
    }
    
    public removeCol(column:string) : ModelDB {
        if(this.selectColumns.indexOf(column) > -1) {
            this.selectColumns.splice(this.selectColumns.indexOf(column),1);
        }
        return this;
    }

    public removeCols(columns:string[]) : ModelDB {
        columns.forEach((column)=>this.removeCol(column));
        return this;
    }
    
    public keepCols(columns:string[]) : ModelDB {
        this.selectColumns = this.selectColumns.filter((column)=>{
            return columns.includes(column);
        });
        return this;
    }

    public suppressEvents(suppress: boolean): ModelDB {
        this.dbHandler.suppressEvents(suppress);
        return this;
    }

    public setIncrementingField(field: string): ModelDB {
        this.dbHandler.setIncrementingField(field);
        return this;
    }

    public fetch(): Promise<SQLResult> {        
        this.dbHandler.cols(this.selectColumns);
        return this.dbHandler.fetch();
    }

    public async fetchModels(): Promise<ModelCollection> {
        const results = await this.fetch().catch(e=>{
            throw e;
        });
        const collection = new ModelCollection;
        results.rows.forEach(row=>{
            const model = this.resultToModel(row);
            if(model) {
                collection.add(model);
            }
        })
        return collection;
    }

    public stream(num: number, callback: (results: any[]) => Promise<boolean>): Promise<void> {
        this.dbHandler.cols(this.selectColumns);
        return this.dbHandler.stream(num, callback);
    }

    public async streamModels(num: number, callback: (results: ModelCollection)=>Promise<boolean>): Promise<void> {
        await this.stream(num, async (results) => {
            var modelCollection = new ModelCollection;
            results.forEach((result)=>{
                var model = this.resultToModel(result);
                if(model) {
                    modelCollection.add(model);
                }                    
            });
            return await callback(modelCollection);
        }).catch(err=>{
            throw err;
        });
    }

    public limit(limitAmount: number): ModelDB {
        this.dbHandler.limit(limitAmount);
        return this;
    }

    public offset(offsetAmount: number): ModelDB {
        this.dbHandler.offset(offsetAmount);
        return this;
    }

    public order(field: string, direction: "ASC" | "DESC"): ModelDB {
        this.dbHandler.order(field, direction);
        return this;
    }

    public group(groupFields: string[]): ModelDB {
        this.dbHandler.group(groupFields);
        return this;
    }

    public count(): Promise<number> {
        return this.dbHandler.count();
    }

    public paginate(perPage:number, page:number): Promise<iPagination> {
        return this.dbHandler.paginate(perPage, page);        
    }

    public where(field: string, comparator: Comparator, value: any, escape: boolean): ModelDB {
        this.dbHandler.where(field, comparator, value, escape);
        return this;
    }

    public whereIn(field: string, subQuery: ModelDB): ModelDB;
    public whereIn(field: string, values: any[], escape: boolean): ModelDB;
    public whereIn(field: string, values: ModelDB | any[], escape: boolean = true): ModelDB {
        if(Array.isArray(values)) {
            this.dbHandler.whereIn(field, values, escape);
        } else {
            this.dbHandler.whereIn(field, values);
        }
        return this;
    }

    public whereNotIn(field: string, subQuery: ModelDB): ModelDB
    public whereNotIn(field: string, values: any[], escape: boolean): ModelDB
    public whereNotIn(field: string, values: ModelDB | any[], escape: boolean = true): ModelDB {
        if(Array.isArray(values)) {
            this.dbHandler.whereNotIn(field, values, escape);
        } else {
            this.dbHandler.whereNotIn(field, values);
        }
        return this;
    }

    public whereNull(field: string): ModelDB {
        this.dbHandler.whereNull(field);
        return this;
    }

    public whereNotNull(field: string): ModelDB {
        this.dbHandler.whereNotNull(field);
        return this;
    }

    public weightedWhere(field: string, comparator: Comparator, value: any, weight: number, nonMatchWeight: number | WeightedCondition, escape: boolean): ModelDB
    public weightedWhere(field: string, comparator: Comparator, value: any, weight: number, nonMatchWeight: number | WeightedCondition, escape: boolean): ModelDB {
        if(typeof nonMatchWeight === "number") {
            this.dbHandler.weightedWhere(field, comparator, value, weight, nonMatchWeight, escape);
        } else {
            this.dbHandler.weightedWhere(field, comparator, value, weight, nonMatchWeight, escape);
        }        
        return this;
    }

    public subWeightedWhere(field: string, comparator: Comparator, value: any, weight: number, nonMatchWeight: WeightedCondition, escape: boolean): WeightedCondition;
    public subWeightedWhere(field: string, comparator: Comparator, value: any, weight: number, nonMatchWeight: number, escape: boolean): WeightedCondition;
    public subWeightedWhere(field: string, comparator: Comparator, value: any, weight: number, nonMatchWeight: number | WeightedCondition, escape: boolean = true): WeightedCondition {
        if(typeof nonMatchWeight === "number") {
            return this.subWeightedWhere(field, comparator, value, weight, nonMatchWeight, escape);
        } else {
            return this.subWeightedWhere(field, comparator, value, weight, nonMatchWeight, escape);
        }        
    }

    public or(): ModelDB {
        this.dbHandler.or();
        return this;
    }
    
    public and(): ModelDB {
        this.dbHandler.and();
        return this;
    }
    
    public openBracket(): ModelDB {
        this.dbHandler.openBracket();
        return this;
    }
    
    public closeBracket(): ModelDB {
        this.dbHandler.closeBracket();
        return this;
    }

    public copyConstraints(queryToCopy: ModelDB): ModelDB {
        this.dbHandler.copyConstraints(queryToCopy);
        return this;
    }

    public join(tableName: ModelDB, tableAlias: string, queryFunc: (q: QueryConstraints) => QueryConstraints): ModelDB;
    public join(tableName: ModelDB, tableAlias: string, primaryKey: string, foreignKey: string): ModelDB;
    public join(tableName: string, queryFunc: (q: QueryConstraints) => QueryConstraints): ModelDB;
    public join(tableName: string, primaryKey: string, foreignKey: string): ModelDB;
    public join(tableName : string | ModelDB, arg2 : string | ((q: QueryConstraints)=>QueryConstraints), arg3 : string | ((q: QueryConstraints)=>QueryConstraints) | undefined = undefined, arg4 : string | undefined = undefined) : ModelDB {
        if(typeof tableName !== "string" && typeof arg2 === "string" && typeof arg3 === "function") {
            this.dbHandler.join(tableName, arg2, arg3);
        } else if(typeof tableName !== "string" && typeof arg2 === "string" && typeof arg3 === "string" && typeof arg4 === "string") {
            this.dbHandler.join(tableName, arg2, arg3, arg4);
        } else if(typeof tableName === "string" && typeof arg2 === "function") {
            this.dbHandler.join(tableName,arg2);
        } else if(typeof tableName === "string" && typeof arg2 === "string" && typeof arg3 === "string") {
            this.dbHandler.join(tableName, arg2, arg3);
        }        
        return this;
    }

    public leftJoin(tableName: ModelDB, tableAlias: string, queryFunc: (q: QueryConstraints) => QueryConstraints): ModelDB;
    public leftJoin(tableName: ModelDB, tableAlias: string, primaryKey: string, foreignKey: string): ModelDB;
    public leftJoin(tableName: string, queryFunc: (q: QueryConstraints) => QueryConstraints): ModelDB;
    public leftJoin(tableName: string, primaryKey: string, foreignKey: string): ModelDB;
    public leftJoin(tableName : string | ModelDB, arg2 : string | ((q: QueryConstraints)=>QueryConstraints), arg3 : string | ((q: QueryConstraints)=>QueryConstraints) | undefined = undefined, arg4 : string | undefined = undefined) : ModelDB {
        if(typeof tableName !== "string" && typeof arg2 === "string" && typeof arg3 === "function") {
            this.dbHandler.leftJoin(tableName, arg2, arg3);
        } else if(typeof tableName !== "string" && typeof arg2 === "string" && typeof arg3 === "string" && typeof arg4 === "string") {
            this.dbHandler.leftJoin(tableName, arg2, arg3, arg4);
        } else if(typeof tableName === "string" && typeof arg2 === "function") {
            this.dbHandler.leftJoin(tableName,arg2);
        } else if(typeof tableName === "string" && typeof arg2 === "string" && typeof arg3 === "string") {
            this.dbHandler.leftJoin(tableName, arg2, arg3);
        }        
        return this;
    }

    public insert(columnValues: { [key: string]: any; }[], escape: boolean): ModelDB;
    public insert(columnValues: { [key: string]: any; }, escape: boolean): ModelDB;
    public insert(columnValues : {[key:string]:any}[] | {[key:string]:any}, escape : boolean = true) : ModelDB {            
        this.dbHandler.insert(columnValues, escape);
        return this;
    }

    public update(columnValues: { [key: string]: any; }, escape: boolean): ModelDB {
        this.dbHandler.update(columnValues, escape);
        return this;
    }

    public save(): Promise<SQLResult> {
        return this.dbHandler.save();
    }

    public delete(): Promise<SQLResult> {
        return this.dbHandler.delete();
    }



}