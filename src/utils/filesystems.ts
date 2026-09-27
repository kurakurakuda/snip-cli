import { Dirent, promises as fs } from 'fs';

export const readFile = async (file: string, dir: string): Promise<any> => {
    try {
        return await fs.readFile(`${dir}/${file}`, 'utf-8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return null;
        }
        throw new Error(`Failed to read file: ${dir}/${file}`, { cause: error });
    }
}

export const readDir = async (dir: string): Promise<Dirent[]> => {
    try {
        return await fs.readdir(dir, { encoding: 'utf-8', withFileTypes: true});
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return [];
        }
        throw new Error(`Failed to read directory: ${dir}`, { cause: error });
    }
}
 
export const writeFile = async (file: string, dir: string, content: string) => {
    try {
        return await fs.writeFile(`${dir}/${file}`, content, "utf-8");
    } catch (error) {
        throw new Error(`Failed to save file: ${dir}/${file}`, { cause: error });
    }
}

export const renameFile = async (file: string, dir:string, newName: string) => {
    try {
        await fs.rename(`${dir}/${file}`, `${dir}/${newName}`);
        return `${dir}/${newName}`;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return null;
        }
        throw new Error(`Failed to rename file: ${dir}/${file}`, { cause: error });
    }
}

export const deleteFile = async (file: string, dir: string): Promise<boolean> => {
    try {
        await fs.unlink(`${dir}/${file}`);
        return true;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return false;
        }
        throw new Error(`Failed to delete file: ${dir}/${file}`, { cause: error });
    }
}