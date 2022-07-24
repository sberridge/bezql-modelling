import BaseModel from "../BaseModel";
import ModelDB from "../ModelDB";
import { addConfig } from './../../index';

describe('construction', () => {
    it('should construct', () => {
        const testColumns = ['id', 'name'];
        const testTable = 'users';
        const model = new BaseModel('test', testTable, 'id', testColumns);
        expect(model).toBeInstanceOf(BaseModel);
        expect(model['original']).toEqual(expect.objectContaining({
            'id': null,
            'name': null,
        }));
        expect(model['columns']).toEqual(expect.arrayContaining(testColumns.map((column) => {
            return `${testTable}.${column}`;
        })));
    });
});

describe('model functions', () => {
    const config = 'test',
        table = 'users',
        primaryKey = 'id',
        columns = ['id', 'name'];
    const generateModel = () => {
        return new BaseModel(config, table, primaryKey, columns);
    }
    let model: BaseModel = generateModel();
    beforeAll(() => {
        addConfig('test', {
            'database': '',
            'host': '',
            'password': '',
            'port': 0,
            'type': 'MySQL',
            'user': ''
        });
    });
    beforeEach(() => {
        model = generateModel();
    });

    it('should set an incrementing field', () => {
        model['setIncrementingField']('id');
        expect(model['incrementingField']).toEqual('id');
    });

    it('should throw if incrementing field does not exist on table', () => {
        let error: any;
        try {
            model['setIncrementingField']('foo');
        } catch(err: any) {
            error = err;
        }
        expect(error).toBeDefined();
        expect(error).toEqual('incrementing field not found');
    });

    it('should return the name of the used DB config', () => {
        expect(model.getSqlConfig()).toEqual('test');
    });

    it('should override the used DB config', () => {
        model.setSqlConfig('test2');
        expect(model.getSqlConfig()).toEqual('test2');
    });
    
    it('should return the table name', () => {        
        expect(model.getTable()).toEqual(table);
    });

    it('should return the primary key', () => {        
        expect(model.getPrimaryKey()).toEqual(primaryKey);
    });

    it('should load data', () => {
        const data = {
            'id': 1,
            'name': 'jim'
        };
        model.loadData({...data, noExist: 1});
        expect(model['original']).toEqual(expect.objectContaining(data));
    });

    it('should create a modeldb instance', () => {
        /* bezql.startQuery = jest.fn().mockImplementation(() => {

        }) */
        const db = model['createDA']();
        expect(db).toBeInstanceOf(ModelDB);
        expect(db['configName']).toEqual(config);
    });
});