import SQLResult from "./../classes/SQLResult"
import WeightedCondition from "./../classes/WeightedCondition"
import iPagination from "./iPagination"
import pSQL from "./pSQL"
import Comparator from "./../types/Comparator"
import ModelCollection from "./../classes/ModelCollection"
import BaseModel from "./../classes/BaseModel"

interface mSQL {
    newQuery():pSQL
    suppressEvents(suppress:boolean): mSQL
    removeCol(column:string): mSQL
    removeCols(columns:string[]) : mSQL
    keepCols(columns:string[]) : mSQL
    fetchModels<TModel extends BaseModel>(): Promise<ModelCollection<TModel>>
    streamModels<TModel extends BaseModel>(num: number, callback: (results: ModelCollection)=>Promise<boolean>): Promise<void>
    limit(limitAmount: number): mSQL
    offset(offsetAmount: number): mSQL
    order(field: string, direction: "ASC" | "DESC"): mSQL

    count(): Promise<number>
    paginate(perPage:number, page:number): Promise<iPagination>

    where(field : string, comparator : Comparator, value : any, escape : boolean) : mSQL
        
    whereNull(field : string) : mSQL

    whereNotNull(field : string) : mSQL

    whereIn(field : string, subQuery : mSQL) : mSQL
    whereIn(field : string, values : any[], escape : boolean) : mSQL
    
    whereNotIn(field : string, subQuery : mSQL) : mSQL
    whereNotIn(field : string, values : any[], escape : boolean) : mSQL

    weightedWhere(field : string, comparator : Comparator, value : any, weight: number, nonMatchWeight: WeightedCondition, escape : boolean) : mSQL
    weightedWhere(field : string, comparator : Comparator, value : any, weight: number, nonMatchWeight: number, escape : boolean) : mSQL
    
    subWeightedWhere(field : string, comparator : Comparator, value : any, weight: number, nonMatchWeight: WeightedCondition, escape : boolean) : WeightedCondition
    subWeightedWhere(field : string, comparator : Comparator, value : any, weight: number, nonMatchWeight: number, escape : boolean) : WeightedCondition

    or(): mSQL
    and(): mSQL
    openBracket(): mSQL
    closeBracket(): mSQL

    update(columnValues: { [key: string]: any; }, escape: boolean): mSQL
    save(): Promise<SQLResult<any>>

    delete(): Promise<SQLResult<any>>
}

export default mSQL;