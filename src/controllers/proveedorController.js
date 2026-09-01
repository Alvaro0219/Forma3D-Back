import { crudController } from '../utils/crudController.js';
import { Proveedor } from '../models/Proveedor.js';

const base = crudController(Proveedor, { searchFields: ['nombre', 'telefono', 'email'] });

export const listProveedores = base.list;
export const getProveedor = base.get;
export const createProveedor = base.create;
export const updateProveedor = base.update;
export const deleteProveedor = base.remove;
