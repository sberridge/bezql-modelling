import * as mod from '../index';
import * as bezql from 'bezql';
import ConnectionConfig from 'bezql/lib/types/ConnectionConfig';

jest.mock('bezql');

describe('Managing database configs', () => {
    it('should add a database configuration', () => {
        const config:ConnectionConfig = {
            'database': 'test',
            'host': 'localhost',
            'password': '',
            'port': 3306,
            'type': 'MySQL',
            'user': ''
        };
        mod.addConfig('test', config);
        expect(bezql.addConfig).toBeCalledWith('test', expect.objectContaining(config));
    });

    it('should remove a database configuration', () => {
        mod.removeConfig('test1');
        expect(bezql.removeConfig).toBeCalledWith('test1');
    });
});

describe('Event management', () => {
    const callback = async () => {
        return true;
    };
    it('should add events', () => {
        const timings = ['before', 'after'] as const;
        const actions = ['SELECT', 'UPDATE', 'INSERT', 'DELETE'] as const;
        timings.forEach((timing) => {
            actions.forEach((action) => {
                mod.addEventListener('test2', timing, action, callback);
                expect(bezql.addEventListener).toBeCalledWith('test2', timing, action, callback);
            });
        });        
    });
});

describe('Configuration', () => {
    it('should add a reserved word', () => {
        mod.addReservedWord('MySQL', 'boom');
        expect(bezql.addReservedWord).toBeCalledWith('MySQL', 'boom');
    });
});

describe('Export BaseModel', () => {
    it('should export the BaseModel class', () => {
        const baseModel = new mod.BaseModel('test', 'test', 'test', []);;
        expect(baseModel).toBeInstanceOf(mod.BaseModel);
    });
});