const requestPromise = require('request-promise');
const {getColorFromURL} = require('color-thief-node');

const url = 'https://collectionapi.metmuseum.org/public/collection/v1/';
const departmentName = "European Paintings";

interface ImageObject {
    objectID: string,
    primaryImage: string,
    primaryImageSmall: string,
    dominantColor: number[],
    dominantPrimaryColor: string
}

interface ImageObjectItems extends Array<ImageObject> {
}

export class MuseumService {
    buildRequestOptions(urlAddition: string): {} {
        let baseUrl = url + urlAddition;
        return {
            method: 'GET',
            uri: baseUrl,
            json: true
        };
    }

    async getObjectsMetadataByObjectIDs(objectIds: number[]): Promise<ImageObjectItems> {
        let imageObjects: ImageObjectItems = [];
        for (const objectId of objectIds) {
            let options = this.buildRequestOptions("objects/" + objectId);
            let result = await requestPromise(options);
            imageObjects.push({
                objectID: result.objectID,
                primaryImage: result.primaryImage,
                primaryImageSmall: result.primaryImageSmall,
                dominantColor: [],
                dominantPrimaryColor: ""
            });
        }

        return imageObjects;
    }

    async getObjectIDsByDepartmentId(departmentId: number): Promise<number[]> {
        let options = this.buildRequestOptions("objects?departmentIds=" + departmentId);
        let result = await requestPromise(options);
        return result.objectIDs;
    }

    async getDepartmentId(): Promise<number> {
        let options = this.buildRequestOptions("departments");
        let result = await requestPromise(options);
        let department = result.departments.find((e: { displayName: string; }) => e.displayName === departmentName);
        let departmentId = -1;
        if (department) {
            departmentId = department.departmentId;
        }

        return departmentId;
    }

    async setDominantColors(objects: ImageObjectItems) {
        for (const imageObject of objects) {
            //  try to get dominant image color from the small primary image url
            if (imageObject.primaryImageSmall !== '') {
                await this.setDominantColorForImage(imageObject, imageObject.primaryImageSmall);
            } else if (imageObject.primaryImage !== '') {
                //  try to get dominant image color from the primary image url
                //  because primaryImageSmall is empty
                await this.setDominantColorForImage(imageObject, imageObject.primaryImage);
            }
        }
    }

    async setDominantColorForImage(imageObject: ImageObject, url: string) {
        let dominantColor = await getColorFromURL(url);
        imageObject.dominantColor = dominantColor;
        //  set dominant primary color
        let primaryColor = "None";
        if (!this.isImageGrayscale(dominantColor)) {
            primaryColor = this.getDominantPrimaryColor(imageObject.dominantColor);
        }
        imageObject.dominantPrimaryColor = primaryColor;
    }

    isImageGrayscale(dominantColor: number[]): boolean {
        //  the picture is grayscale if R == G == B
        return dominantColor[0] === dominantColor[1] && dominantColor[1] === dominantColor[2]
    }

    getDominantPrimaryColor(colors: number[]): string {
        let dominant: number = colors.indexOf(Math.max(...colors));
        let colorArray = ["Red", "Green", "Blue"];
        return colorArray[dominant];
    }

    async getImages(): Promise<ImageObjectItems> {
        let departmentId = await this.getDepartmentId();
        let objects: ImageObjectItems = [];
        if (departmentId > -1) {
            let objectIDs = await this.getObjectIDsByDepartmentId(departmentId);
            objects = await this.getObjectsMetadataByObjectIDs(objectIDs.slice(0, 100));
            await this.setDominantColors(objects);
        }
        return objects;
    }
}
