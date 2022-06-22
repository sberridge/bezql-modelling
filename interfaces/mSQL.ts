import SQLResult from "bezql/lib/classes/SQLResult"
import WeightedCondition from "bezql/lib/classes/WeightedCondition"
import iPagination from "bezql/lib/interfaces/iPagination"
import pSQL from "bezql/lib/interfaces/pSQL"
import Comparator from "bezql/lib/types/Comparator"
import ModelCollection from "./../classes/ModelCollection"

interface mSQL {
    newQuery():pSQL
    suppressEvents(suppress:boolean): mSQL
    removeCol(column:string): mSQL
    removeCols(columns:string[]) : mSQL
    keepCols(columns:string[]) : mSQL
    fetchModels(): Promise<ModelCollection>
    streamModels(num: number, callback: (results: ModelCollection)=>Promise<boolean>): Promise<void>
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
    save(): Promise<SQLResult>

    delete(): Promise<SQLResult>
}

export default mSQL;