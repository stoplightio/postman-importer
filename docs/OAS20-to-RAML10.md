# Import from OAS 2.0 to Raml 1.0

This document describes a proposal to convert OAS 2.0 (OpenApi specification v2.0) into RAML 1.0

# Table of Contents
1. [OAS Swagger Object](#OASSwaggerObject)
2. [Info Object](#InfoObject)
3. [Contact Object](#ContactObject)
4. [License Object](#LicenseObject)
5. [External Documentation Object](#ExternalDocumentationObject)
6. [Tag Object](#TagObject)
7. [Paths Object](#PathObject)
8. [Path Item Object](#PathItemObject)
	1. [Operation Object](#OperationObject)
	2. [Parameters Object](#ParametersObject)
	3. [Responses Object](#ResponsesObject)
9. [SecurityDefinitions](#SecurityDefinitionsObject)
	1. [apiKey](#apikey)
	2. [basic](#basic)
	3. [oauth2](#oauth2)
10. [Data Types](#DataTypes)
11. [Schemas](#Schemas)
12. [Handling references - Reference object](#ReferenceObject)
13. [Handling custom extensions](#CustomExtensions)
14. [RAML 1.0 Gaps](#gaps)
15. [Standard RAML annotations defined for OAS 2.0 conversion](#StdAnnotations)





<a name="OASSwaggerObject"></a>
### OAS Swagger Object
This is the root document object for the API specification. 

<table>
  <tr>
    <td><b>OAS 2.0 Field Name</td>
    <td><B>RAML 1.0 Field Name</td>
  </tr>
  <tr>
    <td>info: Info Object</td>
    <td>
    	<a href="#InfoObject">See Info Object mappings<a>
    </td>
  </tr>
  <tr>
    <td>host: string<br>basePath: string</td>
    <td>baseURI</td>
  </tr>
  <tr>
    <td>schemes: string</td>
    <td>protocols</td>
  </tr>
  <tr>
    <td>consumes: string</td>
    <td>mediaType: consumes + produces<br>
       If request bodies or response bodies at OAS file do not have specific media types:<br> 
		<ul>
		<li>the ones defined at "consumes" are used as media types for requests</li>
		<li>the ones defined at “produces” are used as media types for responses</li>
		</ul>
	</td>
  </tr>
  <tr>
    <td>produces: string</td>
    <td></td>
  </tr>
  <tr>
    <td>paths: Paths object</td>
    <td>/[relativeUri]: <br>
      <a href="#PathObject">See Paths Object mappings.<a>
    </td>
  </tr>
  <tr>
    <td>definitions : Definition object</td>
    <td>types</td>
  </tr>
  <tr>
    <td>parameters : Parameters definitions object<br>
        in: query<br>
        in: header<br>
        in: path<br>
        in: body<br>
        in: formData
    </td>
    <td>In each method where a parameter is referenced, if that parameter is defined at root level, the parameter gets converted into traits. <br>
in: query→ queryParameters<br>
in: header → headers<br>
in: body → body<br>
in: formData→ body multipart/formData<br>
in: path parameters are converted as uriParameters  in each method where they are referenced<br>
        <a href="#ParametersObject">See Parameters Object mappings.<a>
   </td>
  </tr>
  <tr>
    <td>responses : Responses object</td>
    <td>Responses defined at root level get converted as traits and used in each method of      the corresponding HTTP code<br>
        Annotations are used to keep the original responses definition. <br>
       <a href="#ResponsesObject">See Responses Object mappings.<a>
    </td>
  </tr>
  <tr>
    <td>securityDefinitions: <br>
        Security Definitions object</td>
    <td>securitySchemes. <br>
       <a href="#SecurityDefinitionsObject">See Security Definitions mappings.</a>
    </td>
  </tr>
  <tr>
    <td>security : Security Requirement object</td>
    <td>securedBy</td>
  </tr>
  <tr>
    <td>tags : Tag object</td>
    <td>(oas-tags-definition) annotation. 
       <pre>
annotationTypes:  oas-tags-definition:     type: array    items:       properties:         name: string        description?: string
        externalDocs?: string
       </pre>
       <a href="#TagObject">See Tag Object mappings.</a>
     </td>
  </tr>
  <tr>
    <td>externalDocs : External Documentation object</td>
    <td>(oas-externalDocs) annotation. <br>
       <a href="#ExternalDocumentationObject">See External Documentation Object mappings.</a>
    </td>
  </tr>
  <tr>
    <td>^x-</td>
    <td><a href="#CustomExtensions">See Custom extensions mappings.</a></td>
  </tr>
</table>


<a name="InfoObject"></a>
### **Info Object** 

We are handling the info object content as a single annotation with contact, termsOfService and license information.

Since a property of an annotation type cannot inherit from another annotation type, "External Docs" will be a different annotation in order to reuse this annotation at the operation level.

<table>
  <tr>
    <td><b>OAS 2.0 Field Name</td>
    <td><b>RAML 1.0 Field Name</td>
  </tr>
  <tr>
    <td>title : string</td>
    <td>title</td>
  </tr>
  <tr>
    <td>description : string </td>
    <td>description</td>
  </tr>
  <tr>
    <td>termsOfService : string</td>
    <td>oas-info annotation. termsOfService attribute</td>
  </tr>
  <tr>
    <td>contact : Contact Object</td>
    <td>oas-info annotation. contact attribute</td>
  </tr>
  <tr>
    <td>license : License Object</td>
    <td>oas-info annotation. licence attribute</td>
  </tr>
  <tr>
    <td>version : string</td>
    <td>version</td>
  </tr>
</table>


The corresponding RAML annotation type is defined as:
<pre>
oas-info:
  properties:
    termsOfService?: string
    contact?:
      properties:
        name?: string
        url?: string
        email?: string
    license?:
       properties:
         name?: string
         url?: string
</pre>

Example:
<pre>
(oas-info):
  contact:
     name: apiteam@swagger.io
  license:
     name: Apache 2.0
     url: http://www.apache.org/licenses/LICENSE-2.0.html
  termsOfService: http://helloreverb.com/terms/
</pre>

<table>
  <tr>
    <td><b>OAS 2.0 example </td>
    <td><b>RAML 1.0 Conversion</td>
  </tr>
  <tr>
    <td>
    <pre>
Example 1
swagger: "2.0"
info:
  description: |
    This is a sample server Petstore
    server.
    [Learn about Swagger]
    (http://swagger.io) or join the
    IRC channel `#swagger` on
    irc.freenode.net.

    For this sample, you can use the 
    api key `special-key` to test the
    authorization filters
  version: "1.0.0"
  title: Swagger Petstore
  termsOfService: http://helloreverb.com/terms/
  contact:
    name: apiteam@swagger.io
  license:
    name: Apache 2.0
    url: http://www.apache.org/licenses/LICENSE-2.0.html
  
externalDocs:
  description: Find more information here
  url: http://swagger.io

paths: {}
</pre>
</td>
    <td>
    <pre>
#%RAML 1.0
title: Swagger Petstore
version: 1.0.0
description: |
  This is a sample server Petstore server.
  [Learn about Swagger](http://swagger.io) or join the
  IRC channel `#swagger` on irc.freenode.net.
  For this sample, you can use the api key `special-key` to test the
  authorization filters
(oas-externalDocs):
  description: Find more information here
  url: 'http://swagger.io'
(oas-info):
  contact:
    name: apiteam@swagger.io
  termsOfService: 'http://helloreverb.com/terms/'
  license:
    name: Apache 2.0
    url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
annotationTypes:
  oas-externalDocs:
    properties:
      description?: string
      url: string
    allowedTargets:
      - API
      - Method
      - TypeDeclaration
  oas-info:
    properties:
      termsOfService?: string
      contact?:
        properties:
          name?: string
          url?: string
          email?: string
      license?:
        properties:
          name?: string
          url?: string
    allowedTargets: API
  
  </pre>
  </td>
  </tr>
</table>

<a name="ContactObject"></a>
### **Contact Object**

<table>
  <tr>
    <td><b>OAS 2.0 Field Name</td>
    <td><b>RAML 1.0 Field Name</td>
  </tr>
  <tr>
    <td>name : string<br>
url : string <br>
email : string <br>
^x-</td>
    <td>All OAS attributes are concatenated and mapped into :
    <pre>
annotationTypes:
 oas-info:
   properties:
     contact?:
       properties:
         name?: string
         url?: string
         email?: string
    </pre>     
</td>
  </tr>
</table>

<a name="LicenseObject"></a>
### **LicenseObject**

<table>
  <tr>
    <td><b>OAS 2.0 Field Name</td>
    <td><b>RAML 1.0 Field Name</td>
  </tr>
  <tr>
    <td>name : string<br>
url : string<br>
^x-</td>
    <td>All OAS attributes are concatenated and mapped into:
<pre>
annotationTypes:
 oas-info:
   properties:
     license?:
       properties:
         name?: string
         url?: string
</pre>         
    </td>
  </tr>
</table>

<a name="ExternalDocumentationObject"></a>
### **External Documentation Object**

Allows referencing an external resource for extended documentation.

<table>
  <tr>
    <td><b>OAS 2.0 Field Name</td>
    <td><b>RAML 1.0 Field Name</td>
  </tr>
  <tr>
    <td>description : string</td>
    <td>oas-externalDocs annotation. description attribute</td>
  </tr>
  <tr>
    <td>url : string</td>
    <td>oas-externalDocs annotation. description attribute</td>
  </tr>
</table>

<pre>
AnnotationTypes:
  oas-externalDocs: 
   properties:     description?: string     url: string
</pre>

Example:
<table>
  <tr>
    <td><b>OAS 2.0 example </td>
    <td><b>RAML 1.0 Conversion</td>
  </tr>
  <tr>
    <td>
<pre>
Example 2
swagger: "2.0"
info:
  description: |
    This is a sample server Petstore server.
    [Learn about Swagger](http://swagger.io) or join the 
    IRC channel `#swagger` on irc.freenode.net.
    For this sample, you can use the api key `special-key` 
    to test the authorization filters
  version: "1.0.0"
  title: Swagger Petstore
  termsOfService:   http://helloreverb.com/terms/
  contact:
    name: apiteam@swagger.io
  license:
    name: Apache 2.0
    url: http://www.apache.org/licenses/LICENSE-2.0.html
externalDocs:
   description: Find more information here
   url: http://swagger.io
paths: {}
</pre>
    </td>
    <td>
<pre>#%RAML 1.0
title: Swagger Petstore
version: 1.0.0
description: |
  This is a sample server Petstore server.
  [Learn about Swagger](http://swagger.io) or join the IRC channel `#swagger` on
  irc.freenode.net. For this sample, you can use the api key `special-key` to test the
  authorization filters
(oas-externalDocs):
  description: Find more information here
  url: 'http://swagger.io'
(oas-info):
  contact:
    name: apiteam@swagger.io
  termsOfService: 'http://helloreverb.com/terms/'
  license:
    name: Apache 2.0
    url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
annotationTypes:
  oas-externalDocs:
    properties:
      description?: string
      url: string
    allowedTargets:
      - API
      - Method
      - TypeDeclaration
  oas-info:
    properties:
      termsOfService?: string
      contact?:
        properties:
          name?: string
          url?: string
          email?: string
      license?:
        properties:
          name?: string
          url?: string
    allowedTargets: API
</pre>
</td>
  </tr>
</table>

<a name="TagObject"></a>
### Tag Object

Allows adding metadata to a single tag that is used by the Operation Object. 

<table>
  <tr>
    <td><b>OAS 2.0 Field Name</td>
    <td><b>RAML 1.0 Field Name</td>
  </tr>
  <tr>
    <td>name: string</td>
    <td>oas-tags-definition annotation. name</td>
  </tr>
  <tr>
    <td>description: string</td>
    <td>oas-tags-definition annotation. description attribute</td>
  </tr>
  <tr>
    <td>externalDocs: string</td>
    <td>oas-tags-definition annotation. externalDocs attribute</td>
  </tr>
</table>

<pre>
annotationTypes:
  oas-tags-definition: 
    type: array
    items: 
      properties: 
        name: string
        description?: string
        externalDocs?: 
           description?: string
           url: string
</pre>

Example:

<table>
  <tr>
    <td><b>OAS 2.0 example </td>
    <td><b>RAML 1.0 Conversion</td>
  </tr>
  <tr>
    <td>
<pre>
Example 3
swagger: "2.0"
info:
    version: "1.0"
    title: tags example
tags:
  - name: Most important resources
    description: I want these listed first
  - name: Not important resources
    description: I want these listed after most
  - name: Least important resources
    description: I want these listed last
    externalDocs: 
      url: http://anurl.com
paths: {}
</pre>
</td>
    <td>
<pre>
#%RAML 1.0
title: tags example
version: 1.0
annotationTypes:
  oas-tags-definition: 
    type: array
    items: 
      properties: 
        name: string
        description?: string
        externalDocs?: string
-tags-definition):
  - name: Most important resources
    description: I want these listed first
  - name: Not important resources
    description: I want these listed after most
  - name: Least important resources
    description: I want these listed last
    externalDocs: 
      url: http://anurl.com
</pre>
</td>
  </tr>
</table>

<a name="PathObject"></a>
### Path Object

Holds the relative paths to the individual endpoints.
<pre>
"paths":{    "/":{        "get":{            "parameters": ....        }    },    {    "/{id}":{        "get":{            "parameters":....        }    }    }}
</pre>

<a name="PathItemObject"></a>
### Path Item Object

<table>
  <tr>
    <td><b>OAS 2.0 Operation Name</td>
    <td><b>RAML 1.0 Operation Name</td>
  </tr>
  <tr>
    <td>$ref </td>
    <td><a href="#PathObject">See References mappings.</a>
</td>
  </tr>
  <tr>
    <td>get</td>
    <td>get</td>
  </tr>
  <tr>
    <td>put</td>
    <td>put</td>
  </tr>
  <tr>
    <td>post</td>
    <td>post</td>
  </tr>
  <tr>
    <td>delete</td>
    <td>delete</td>
  </tr>
  <tr>
    <td>options</td>
    <td>options</td>
  </tr>
  <tr>
    <td>head</td>
    <td>head</td>
  </tr>
  <tr>
    <td>patch</td>
    <td>patch</td>
  </tr>
</table>

<a name="OperationObject"></a>
#### Operation Object

<table>
  <tr>
    <td><b>OAS 2.0 Field Name</td>
    <td><b>RAML 1.0 Field Name</td>
  </tr>
  <tr>
    <td>tags</td>
    <td>Mapped as an annotation.<br>
<pre>AnnotationTypes:
   oas-tags:string[]
Example:
/pets:
  /{pedId}:
     get:       (oas-tags): [pet]
</pre>       
</td>
  </tr>
  <tr>
    <td>summary</td>
    <td>AnnotationTypes:
    oas-summary: string</td>
  </tr>
  <tr>
    <td>description</td>
    <td>description.</td>
  </tr>
  <tr>
    <td>externalDocs</td>
    <td>Mapped as an annotation <br>
<pre>
AnnotationTypes:
   oas-externalDocs: 
     properties:        description:          string        url?:          string
           required: true
Example:
/pets:
  /{pedId}:
     get:       (oas-externalDocs):
          description: find more info here
          url: https://swagger.io/about
</pre>
</td>
  </tr>
  <tr>
    <td>operationId</td>
    <td>displayName</td>
  </tr>
  <tr>
    <td>consumes</td>
    <td>The body declaration is a map having key names that are valid media types of the request body.
<pre>Example:
/groups:  post:    body:      application/json:        properties:          groupName:          deptCode:            type: number      text/xml:        type: string
</pre>
</td>
  </tr>
  <tr>
    <td>produces</td>
    <td>Like consumes but using body declaration at the response level.
<pre>Example:
post:    body:      type: Invoice    responses:      201:        headers:          Location:            example: /invoices/45612        body:          application/json:            type: !include schemas/invoice.json          text/xml:            type: !include schemas/invoice.xsd
</pre>
</td>
  </tr>
  <tr>
    <td>parameters</td>
    <td>queryParameters.<a href="#ParametersObject">See Parameters object mappings.</a>
    </td>
  </tr>
  <tr>
    <td>responses</td>
    <td>responses. <a href="#ResponsesObject">See Responses Object mappings.</a>
</td>
  </tr>
  <tr>
    <td>schemes</td>
    <td>RAML 1.0 does not support declaring specific schemes or protocols on the operation level.</td>
  </tr>
  <tr>
    <td>deprecated</td>
    <td>Mapped as an annotation.
<pre>    
AnnotationTypes:
   oas-deprecated: boolean
Example:
/pets:
  /{pedId}:
     get:       (oas-deprecated): true
</pre>
  </td>
  </tr>
  <tr>
    <td>security</td>
    <td>securedBy</td>
  </tr>
</table>

<a name="ParametersObject"></a>
#### Parameters Object

<table>
  <tr>
    <td><b>OAS 2.0 Field Name</td>
    <td><b>RAML 1.0 Field Name</td>
  </tr>
  <tr>
    <td>name</td>
    <td>name</br>
    <ul>
<li>If in is "path", the name consists of  part of the resource path plus uriParameters.
<li>if in is "body", the name is converted into an annotation (oas-body-name).
<li>For all other cases, the name corresponds to the parameter name defined at the in property
    <ul>
    </td>
  </tr>
  <tr>
    <td>in</td>
    <td>Required. The location of the parameter. <br>
    Possible values are "query", "header", "path", "formData" or "body".
<ul>
<li>query → queryParameters
<li>header → header
<li>path → resource path and uriParameters
<li>formData → body of multipart/form-data type
<li>body → body
<ul>
</td>
  </tr>
  <tr>
    <td>description</td>
    <td>description</td>
  </tr>
  <tr>
    <td>required</td>
    <td>In RAML, required is true by default. Mapped to required=false when necessary.</td>
  </tr>
</table>


If **in** is "body":

<table>
  <tr>
    <td>OAS 2.0 Field Name</td>
    <td> RAML 1.0 Field Name</td>
  </tr>
  <tr>
    <td>schema</td>
    <td>body</td>
  </tr>
</table>


If **in** is any value other than "body":

<table>
  <tr>
    <td><b>OAS 2.0 Field Name</td>
    <td><b>RAML 1.0 Field Name</td>
  </tr>
  <tr>
    <td>type<br>format</td>
    <td>type and format.<br> 
       <a href="#DataTypes">See Data Types mappings.</a>
    </td>
  </tr>
  <tr>
    <td>allowEmptyValue</td>
    <td>Converted as annotation.<br> <a href="#StdAnnotations">See RAML annotations for OAS conversion.</a>
</td>
  </tr>
  <tr>
    <td>items</td>
    <td>items</td>
  </tr>
  <tr>
    <td>collectionFormat<br>
    <ul>
      <li>csv
      <li>ssv
      <li>tsv
      <li>pipes
      <li>multi
    </ul>
    </td>
    <td>Converted as annotation. <br> <a href="#StdAnnotations">See RAML annotations for OAS conversion.</a>
</td>
  </tr>
  <tr>
    <td>default</td>
    <td>default</td>
  </tr>
  <tr>
    <td>maximum</td>
    <td>maximum</td>
  </tr>
  <tr>
    <td>exclusiveMaximum</td>
    <td><a href="#StdAnnotations">See RAML annotations for OAS conversion.</a></td>
  </tr>
  <tr>
    <td>minimum</td>
    <td>minimum</td>
  </tr>
  <tr>
    <td>exclusiveMinimum</td>
    <td><a href="#StdAnnotations">See RAML annotations for OAS conversion.</a></td>
  </tr>
  <tr>
    <td>maxLength</td>
    <td>maxLength</td>
  </tr>
  <tr>
    <td>minLength</td>
    <td>minLength</td>
  </tr>
  <tr>
    <td>pattern</td>
    <td>pattern</td>
  </tr>
  <tr>
    <td>maxItems</td>
    <td>maxItems</td>
  </tr>
  <tr>
    <td>minItems</td>
    <td>minItems</td>
  </tr>
  <tr>
    <td>uniqueItems</td>
    <td>uniqueItems</td>
  </tr>
  <tr>
    <td>enum</td>
    <td>enum</td>
  </tr>
  <tr>
    <td>multipleOf</td>
    <td>multipleOf
</td>
  </tr>
</table>


Example:

<table>
  <tr>
    <td><b>OAS 2.0 TAGS example</td>
    <td><b>RAML 1.0 Conversion</td>
  </tr>
  <tr>
    <td>
<pre>
Example 4
swagger: "2.0"
info:
    version: "1.0"
    title: Swagger Petstore
tags:
  - name: pet
    description: Everything you need to handle pets
paths:
    '/pets':
        get:
            tags:
                - pet
            summary: Find pets
            description: Find all pets
            operationId: getPet
            externalDocs: 
                description: find more info here
                url: https://swagger.io/about
            responses:
              default:
                description: Default response
</pre>



    </td>
    <td>
<pre>    
#%RAML 1.0
title: Swagger Petstore
version: '1.0'
(oas-tags-definition):
  - name: pet
    description: Everything you need to handle pets
annotationTypes:
  oas-tags-definition:
    type: array
    items:
      properties:
        name: string
        description?: string
        externalDocs?:
          properties:
            url: string
            description?: string
    allowedTargets: API
  oas-tags:
    type: 'string[]'
    allowedTargets: Method
  oas-summary:
    type: string
    allowedTargets: Method
  oas-externalDocs:
    properties:
      description?: string
      url: string
    allowedTargets:
      - API
      - Method
      - TypeDeclaration
  oas-responses-default: any
/pets:
  displayName: pets
  get:
    displayName: getPet
    description: Find all pets
    (oas-summary): Find pets
    (oas-responses-default):
      description: Default response
    (oas-tags):
      - pet
    (oas-externalDocs):
      description: find more info here
      url: 'https://swagger.io/about'
</pre>  
  </td>
  </tr>
</table>


<table>
  <tr>
    <td><b>OAS 2.0 parameter examples</td>
    <td><b>RAML 1.0 Conversion</td>
  </tr>
  <tr>
    <td>
<pre>
Example 5
Query parameter
swagger: "2.0"
info:
    version: "1.0"
    title: Swagger Petstore
tags:
  - name: pet
    description: Everything you need to handle pets
paths:
    /pets/findByStatus:
        get:
            tags:
                - pet
            summary: Finds Pets by status
            description: status value
            operationId: findPetsByStatus
            parameters:
                - in: query
                  name: status
                  description: Status value
                  type: array
                  items:
                    type: string
            responses:
              default:
                description: Default response
</pre>
</td>
    <td>
<pre>    
#%RAML 1.0
title: Swagger Petstore
version: '1.0'
(oas-tags-definition):
  - name: pet
    description: Everything you need to handle pets
annotationTypes:
  oas-tags-definition:
    type: array
    items:
      properties:
        name: string
        description?: string
        externalDocs?:
          properties:
            url: string
            description?: string
    allowedTargets: API
  oas-tags:
    type: 'string[]'
    allowedTargets: Method
  oas-summary:
    type: string
    allowedTargets: Method
  oas-respnses-default: any
/pets:
  displayName: pets
  /findByStatus:
    displayName: findByStatus
    get:
      displayName: findPetsByStatus
      description: status value
      (oas-summary): Finds Pets by status
      (oas-default-response):
        description: Default response      
      queryParameters:
        status:
          description: Status value
          type: array
          displayName: Status value
          items:
            type: string
      (oas-tags):
        - pet
</pre>

</td>
  </tr>
  <tr>
    <td>
<pre>    
Example 6
Path parameter 
swagger: "2.0"
info:
    version: "1.0"
    title: Swagger Petstore
tags:
  - name: pet
    description: Everything you need to handle pets
paths:
    /pets/{petId}:
        get:
            tags:
                - pet
            summary: Find pet by ID
            description: Returns a pet when ID < 10.  
                ID > 10 or nonintegers will simulate 
                API error conditions
            operationId: getPetById
            parameters:
                - in: path
                  name: petId
                  description: ID of pet that needs to 
                               be fetched
                  required: true
                  type: integer
                  format: int64
                  default: 1
                  minimum: 1
                  maximum: 5
            responses:
              default:
                description: Default response
</pre>
    </td>
    <td>
<pre>
#%RAML 1.0
title: Swagger Petstore
version: '1.0'
(oas-tags-definition):
  - name: pet
    description: Everything you need to handle pets
annotationTypes:
  oas-tags-definition:
    type: array
    items:
      properties:
        name: string
        description?: string
        externalDocs?:
          properties:
            url: string
            description?: string
    allowedTargets: API
  oas-tags:
    type: 'string[]'
    allowedTargets: Method
  oas-summary:
    type: string
    allowedTargets: Method
  oas-responses-default: any
/pets:
  displayName: pets
  '/{petId}':
    displayName: '{petId}'
    uriParameters:
      petId:
        description: ID of pet that needs to be fetched
        required: true
        type: integer
        format: int64
        default: 1
        minimum: 1
        maximum: 5
    get:
      displayName: getPetById
      description: Returns a pet when ID < 10. ID > 10 or nonintegers will simulate API error conditions
      (oas-summary): Find pet by ID
      (oas-responses-default):
        description: Default response
      (oas-tags):
        - pet
</pre>
    </td>
  </tr>
  <tr>
    <td>
<pre>
Example 7
Body parameter
swagger: "2.0"
info:
    version: "1.0"
    title: Swagger Petstore
tags:
  - name: pet
    description: Everything you need to handle pets
definitions:
    Order:
        type: object
        properties:
          id:
            type: integer
            format: int64
          petId:
            type: integer
            format: int64
          quantity:
            type: integer
            format: int32
          shipDate:
            type: string
            format: date-time
          status:
            type: string
            description: Order Status
          complete:
            type: boolean

paths:
    /store/order:
      post:
        tags:
        - store
        summary: Place an order for a pet
        description: ''
        operationId: placeOrder
        produces:
        - application/json
        - application/xml
        parameters:
        - in: body
          name: body
          description: order placed for 
                       purchasing the pet
          required: true
          schema:
            "$ref": "#/definitions/Order"
        responses:
          '200':
            description: successful operation
            schema:
              "$ref": "#/definitions/Order"
          '400':
            description: Invalid Order
</pre>

    </td>
    <td>
<pre>
#%RAML 1.0
title: Swagger Petstore
version: '1.0'
(oas-tags-definition):
  - name: pet
    description: Everything you need to handle pets
annotationTypes:
  oas-tags-definition:
    type: array
    items:
      properties:
        name: string
        description?: string
        externalDocs?:
          properties:
            url: string
            description?: string
    allowedTargets: API
  oas-tags:
    type: 'string[]'
    allowedTargets: Method
  oas-summary:
    type: string
    allowedTargets: Method
  oas-body-name:
    type: string
    allowedTargets: TypeDeclaration
/store:
  displayName: store
  /order:
    displayName: order
    post:
      displayName: placeOrder
      (oas-summary): Place an order for a pet
      body:
        application/json:
          type: Order
          (oas-body-name): body
          description: order placed for purchasing 
                 the pet
      responses:
        '200':
          body:
            application/json:
              type: Order
          description: successful operation
        '400':
          description: Invalid Order
      (oas-tags):
        - store
types:
  Order:
    properties:
      id:
        type: integer
        format: int64
        required: false
      petId:
        type: integer
        format: int64
        required: false
      quantity:
        type: integer
        format: int32
        required: false
      shipDate:
        type: datetime
        format: rfc3339
        required: false
      status:
        type: string
        description: Order Status
        required: false
      complete:
        type: boolean
        required: false
</pre>
   </td>
  </tr>
  <tr>
    <td>
<pre>
Example 8
Formdata parameter
swagger: "2.0"
info:
    version: "1.0"
    title: Swagger Petstore
tags:
  - name: pet
    description: Everything you need to handle pets
definitions:
    Order:
        type: object
        properties:
          id:
            type: integer
            format: int64
          petId:
            type: integer
            format: int64
          quantity:
            type: integer
            format: int32
          shipDate:
            type: string
            format: date-time
          status:
            type: string
            description: Order Status
          complete:
            type: boolean

paths:
    "/pet/{petId}":
      post:
        tags:
        - pet
        summary: Updates a pet in the store 
                 with form data
        operationId: updatePetWithForm
        consumes:
        - application/x-www-form-urlencoded
        produces:
        - application/json
        - application/xml
        parameters:
        - name: petId
          in: path
          description: ID of pet that needs 
                to be updated
          required: true
          type: integer
          format: int64
        - name: name
          in: formData
          description: Updated name of the pet
          required: false
          type: string
        - name: status
          in: formData
          description: Updated status of the pet
          required: false
          type: string
        responses:
          '405':
            description: Invalid input
</pre>
</td>
    <td>
<pre>
#%RAML 1.0
title: Swagger Petstore
version: '1.0'
(oas-tags-definition):
  - name: pet
    description: Everything you need to handle pets
annotationTypes:
  oas-tags-definition:
    type: array
    items:
      properties:
        name: string
        description?: string
        externalDocs?:
          properties:
            url: string
            description?: string
    allowedTargets: API
  oas-tags:
    type: 'string[]'
    allowedTargets: Method
  oas-summary:
    type: string
    allowedTargets: Method
/pet:
  displayName: pet
  '/{petId}':
    displayName: '{petId}'
    uriParameters:
      petId:
        description: ID of pet that needs to be updated
        required: true
        type: integer
        format: int64
        displayName: ID of pet that needs to be updated
    post:
      displayName: updatePetWithForm
      (oas-summary): Updates a pet in the store 
                     with form data
      body:
        multipart/form-data:
          properties:
            name:
              description: Updated name of the pet
              required: false
              type: string
            status:
              description: Updated status of the pet
              required: false
              type: string
      responses:
        '405':
          description: Invalid input
      (oas-tags):
        - pet
types:
  Order:
    properties:
      id:
        type: integer
        format: int64
        required: false
      petId:
        type: integer
        format: int64
        required: false
      quantity:
        type: integer
        format: int32
        required: false
      shipDate:
        type: datetime
        format: rfc3339
        required: false
      status:
        type: string
        description: Order Status
        required: false
      complete:
        type: boolean
        required: false
</pre>
    </td>
  </tr>
</table>


When parameters are defined at the root level of the OAS file, they can be referenced at method level using $ref. So global parameters are converted as traits as follows: 
<pre>
traits
 → trait name = OAS parameter-name
	→ queryParameter or header or body = OAS parameter name
</pre>


<table>
  <tr>
    <td><b>OAS 2.0 global parameter examples</td>
    <td><b>RAML 1.0 Conversion</td>
  </tr>
  <tr>
    <td>
<pre>
Example 9
swagger: '2.0'
info:
  version: 1.1.0
  title: Simple API
definitions:
  Person:
    title: Human
    description: A person which can be the user itself or one of his friend
    required:
      - username
    properties:
      firstName:
        description: first name
        type: string
        example: John
      lastName:
        description: last name
        type: string
        example: Doe
      username:
        description: Username used to connect to the service
        type: string
        pattern: '[a-z0-9]{8,64}'
        minLength: 8
        maxLength: 64
        example: john1doe6
parameters:
  username:
    name: username
    in: path
    required: true
    description: The person's username
    type: string
  userAgent:
    name: userAgent
    description: All API consumers MUST provide a user agent
    type: string
    in: header
    required: true
  pageSize:
    name: pageSize
    in: query
    description: Number of persons returned
    type: integer
    format: int32
    required: true
  userData:
    name: userData
    in: formData
    description: The person's data
    required: true
    type: string
  userBody:
    name: userBody
    in: body
    required: true
    description: The person body.
    schema:
      $ref: '#/definitions/Person'

paths:
  '/persons/{username}':
    parameters:
      - $ref: '#/parameters/username'
      - $ref: '#/parameters/userAgent'
      - $ref: '#/parameters/pageSize'
    get:
      summary: Gets a person
      description: Returns a single person for its username.
      operationId: readPerson

      responses:
        '200':
          description: A Person
          schema:
            $ref: '#/definitions/Person'
          headers:
            X-Rate-Limit-Remaining:
              description: How many calls consumer can do
              type: integer
            X-Rate-Limit-Reset:
              description: When rate limit will be reset
              type: string
              format: date-time
    </pre>
</td>
    <td>
<pre>
#%RAML 1.0
title: Simple API
version: 1.1.0
/persons:
  displayName: persons
  '/{username}':
    displayName: '{username}'
    uriParameters:
      username:
        required: true
        description: The person's username
        type: string
        displayName: The person's username
    get:
      displayName: readPerson
      description: Returns a single person for its username.
      (oas-summary): Gets a person
      responses:
        '200':
          body:
            application/json
              type: Person
          description: A Person
          headers:
            X-Rate-Limit-Remaining:
              type: integer
              description: How many calls consumer can do
            X-Rate-Limit-Reset:
              type: datetime
              description: When rate limit will be reset
              format: rfc3339
    is:
      - userAgent
      - pageSize
types:
  Person:
    description: A person which can be the user itself or one of his friend
    properties:
      firstName:
        description: first name
        type: string
        example: John
        required: false
      lastName:
        description: last name
        type: string
        example: Doe
        required: false
      username:
        description: Username used to connect to the service
        type: string
        pattern: '[a-z0-9]{8,64}'
        minLength: 8
        maxLength: 64
        example: john1doe6
    (oas-schema-title): Human
  Error:
    description: Give full information about the problem
    properties:
      code:
        description: A human readable code 
                 (death to numeric error codes!)
        type: string
    (oas-schema-title): MultiLingualMultiDeviceError
traits:
  pageSize:
    queryParameters:
      pageSize:
        type: integer
        description: Number of persons returned
        format: int32
        required: true
  userAgent:
    headers:
      userAgent:
        type: string
        description: All API consumers MUST provide a user agent
        required: true
  userData:
    body:
      multipart/form-data:
        properties:
          userData:
            description: The person's data
            required: true
            type: string
        description: The person's data
  userBody:
    body:
      application/json:
        type: Person
        (oas-body-name): userBody
        description: The person body.
annotationTypes:
  oas-tags:
    type: 'string[]'
    allowedTargets: Method
  oas-summary:
    type: string
    allowedTargets: Method
  oas-schema-title:
    type: string
    allowedTargets: TypeDeclaration
  oas-body-name:
    type: string
    allowedTargets: TypeDeclaration
  oas-responses-default: any
</pre>
   </td>
  </tr>
</table>

<a name="ResponsesObject"></a>
#### Responses Object

<table>
  <tr>
    <td><b>OAS 2.0 Field Name</td>
    <td><b>RAML 1.0 Field Name</td>
  </tr>
  <tr>
    <td>status code<br>
default HTTP status code		</td>
    <td>The default does not map to RAML
The HTTP status code maps to the HTTP status code</td>
  </tr>
  <tr>
    <td>description</td>
    <td>description</td>
  </tr>
  <tr>
    <td>schema</td>
    <td>body</td>
  </tr>
  <tr>
    <td>headers</td>
    <td>headers</td>
  </tr>
  <tr>
    <td>examples</td>
    <td>example</td>
  </tr>
</table>


<table>
  <tr>
    <td><b>OAS 2.0 responses examples</td>
    <td><b>Converts to RAML 1.0 this way</td>
  </tr>
  <tr>
    <td>
<pre>
Example 10
swagger: "2.0"
info:
    version: "1.0"
    title: Swagger Petstore
tags:
  - name: pet
    description: Everything you need to handle pets
definitions:
    Order:
        type: object
        properties:
          id:
            type: integer
            format: int64
          petId:
            type: integer
            format: int64
          quantity:
            type: integer
            format: int32
          shipDate:
            type: string
            format: date-time
          status:
            type: string
            description: Order Status
          complete:
            type: boolean
    Pet:
        type: object
        required:
          - name
          - photoUrls
        properties:
          id:
            type: integer
            format: int64
          name:
            type: string
            example: doggie
          photoUrls:
            type: array
            items:
              type: string
          tags:
            type: array
            items:
              $ref: "#/definitions/Tag"
          status:
            type: string
            description: pet status in the store
    Tag:
        type: object
        properties:
          id:
            type: integer
            format: int64
          name:
            type: string
paths:
    "/pet/{petId}":
      post:
        tags:
        - pet
        summary: Updates a pet in the store with form data
        operationId: updatePetWithForm
        consumes:
        - application/x-www-form-urlencoded
        produces:
        - application/json
        - application/xml
        parameters:
        - name: petId
          in: path
          description: ID of pet that needs 
                       to be updated
          required: true
          type: integer
          format: int64
        - name: name
          in: formData
          description: Updated name of the pet
          required: false
          type: string
        - name: status
          in: formData
          description: Updated status of the pet
          required: false
          type: string
        responses:
          "200":
            description: successful operation
            schema:
                $ref: "#/definitions/Pet"
          "400":
            description: Invalid tag value
</pre>

</td>
    <td>
<pre>
#%RAML 1.0
title: Swagger Petstore
version: '1.0'
(oas-tags-definition):
  - name: pet
    description: Everything you need to handle pets
annotationTypes:
  oas-tags-definition:
    type: array
    items:
      properties:
        name: string
        description?: string
        externalDocs?:
          properties:
            url: string
            description?: string
    allowedTargets: API
  oas-tags:
    type: 'string[]'
    allowedTargets: Method
  oas-summary:
    type: string
    allowedTargets: Method
/pet:
  displayName: pet
  '/{petId}':
    displayName: '{petId}'
    uriParameters:
      petId:
        description: ID of pet that needs to be updated
        required: true
        type: integer
        format: int64
        displayName: ID of pet that needs to be updated
    post:
      displayName: updatePetWithForm
      (oas-summary): Updates a pet in the store 
                     with form data
      body:
        multipart/form-data:
          properties:
            name:
              description: Updated name of the pet
              required: false
              type: string
            status:
              description: Updated status of the pet
              required: false
              type: string
          description: Updated status of the pet
      responses:
        '200':
          body:
            application/json:
              type: Pet
          description: successful operation
        '400':
          description: Invalid tag value
      (oas-tags):
        - pet
types:
  Order:
    properties:
      id:
        type: integer
        format: int64
        required: false
      petId:
        type: integer
        format: int64
        required: false
      quantity:
        type: integer
        format: int32
        required: false
      shipDate:
        type: datetime
        format: rfc3339
        required: false
      status:
        type: string
        description: Order Status
        required: false
      complete:
        type: boolean
        required: false
  Pet:
    properties:
      id:
        type: integer
        format: int64
        required: false
      name:
        type: string
        example: doggie
      photoUrls:
        type: array
        items:
          type: string
      tags:
        type: array
        items:
          type: Tag
        required: false
      status:
        type: string
        description: pet status in the store
        required: false
  Tag:
    properties:
      id:
        type: integer
        format: int64
        required: false
      name:
        type: string
        required: false
</pre>
   </td>
  </tr>
</table>


When responses are defined at the root level of the OAS file, they can be referenced at method level using $ref. These responses are  converted to RAML using dereference and used at each method in the corresponding HTTP code.

The OAS default response cannot be directly mapped into a response error code, so we will define a new annotation **(oas-responses-default)** in order to describe the default response and prevent loss of  that information.

An annotation is going to be used to keep global response definitions and other definitions  at the method level. The annotation allows the reference to the global response name that was dereferenced. This annotation will be **(oas-global-response-definition)**.

<table>
  <tr>
    <td><b>OAS 2.0 responses examples</td>
    <td><b>RAML 1.0 Conversion</td>
  </tr>
  <tr>
    <td>
<pre>
Example 11
swagger: '2.0'
info:
  version: 1.1.0
  title: Simple API
paths:
  '/persons/{username}':
    parameters:
      - $ref: '#/parameters/username'
      - $ref: '#/parameters/userAgent'
      - $ref: '#/parameters/pageSize'
    get:
      summary: Gets a person
      description: Returns a single person for its username.
      operationId: readPerson
      tags:
        - Persons
      responses:
        '200':
          description: A Person
          schema:
            $ref: '#/definitions/Person'
          headers:
            X-Rate-Limit-Remaining:
              description: How many calls consumer can do
              type: integer
            X-Rate-Limit-Reset:
              description: When rate limit will be reset
              type: string
              format: date-time
        '404':
          $ref: '#/responses/PersonDoesNotExistResponse'
        '500':
          $ref: '#/responses/Standard500ErrorResponse'
        default:
          $ref: '#/responses/TotallyUnexpectedResponse'

definitions:
  Person:
    title: Human
    description: A person which can be the user itself or one of his friend
    required:
      - username
    properties:
      firstName:
        description: first name
        type: string
        example: John
      lastName:
        description: last name
        type: string
        example: Doe
      username:
        description: Username used to connect to the service
        type: string
        pattern: '[a-z0-9]{8,64}'
        minLength: 8
        maxLength: 64
        example: john1doe6
  Error:
    title: MultiLingualMultiDeviceError
    description: Give full information about the problem
    required:
      - code
    properties:
      code:
        description: A human readable code 
                    (death to numeric error codes!)
        type: string

responses:
  Standard500ErrorResponse:
    description: An unexpected error occured.
    headers:
      X-Rate-Limit-Remaining:
        description: How many calls consumer can do
        type: integer
      X-Rate-Limit-Reset:
        description: When rate limit will be reset
        type: string
        format: date-time
    schema:
      $ref: '#/definitions/Error'
  PersonDoesNotExistResponse:
    description: Person does not exist.
    headers:
      X-Rate-Limit-Remaining:
        description: How many calls consumer can do
        type: integer
      X-Rate-Limit-Reset:
        description: When rate limit will be reset
        type: string
        format: date-time
  TotallyUnexpectedResponse:
    description: A totally unexpected response
    headers:
      X-Rate-Limit-Remaining:
        description: How many calls consumer can do
        type: integer
      X-Rate-Limit-Reset:
        description: When rate limit will be reset
        type: string
        format: date-time
parameters:
  username:
    name: username
    in: path
    required: true
    description: The person's username
    type: string
  userAgent:
    name: userAgent
    description: All API consumers MUST provide a user agent
    type: string
    in: header
    required: true
  pageSize:
    name: pageSize
    in: query
    description: Number of persons returned
    type: integer
    format: int32
    required: true
  userData:
    name: userData
    in: formData
    description: The person's data
    required: true
    type: string
  userBody:
    name: userBody
    in: body
    required: true
    description: The person body.
    schema:
      $ref: '#/definitions/Person'
</pre>
</td>
    <td>
<pre>
#%RAML 1.0
title: Simple API
version: 1.1.0
/persons:
  displayName: persons
  '/{username}':
    displayName: '{username}'
    uriParameters:
      username:
        required: true
        description: The person's username
        type: string
        displayName: The person's username
    get:
      displayName: readPerson
      description: Returns a single person for its username.
      (oas-summary): Gets a person
      (oas-responses-default):
        (oas-global-response-definition):
                         TotallyUnexpectedResponse
        description: A totally unexpected response
        headers:
          X-Rate-Limit-Remaining:
            type: integer
            description: How many calls consumer can do
          X-Rate-Limit-Reset:
            type: datetime
            description: When rate limit will be reset
            format: rfc3339
      responses:
        '200':
          body:
            application/json
              type: Person
          description: A Person
          headers:
            X-Rate-Limit-Remaining:
              type: integer
              description: How many calls consumer can do
            X-Rate-Limit-Reset:
              type: datetime
              description: When rate limit will be reset
              format: rfc3339
        '404':
          (oas-global-response-definition):
                        PersonDoesNotExistResponse
          description: Person does not exist.
          headers:
            X-Rate-Limit-Remaining:
              type: integer
              description: How many calls consumer can do
            X-Rate-Limit-Reset:
              type: datetime
              description: When rate limit will be reset
              format: rfc3339
        '500':
          (oas-global-response-definition):
                          Standard500ErrorResponse
          body:
            application/json 
              type: Error
          description: An unexpected error occured.
          headers:
            X-Rate-Limit-Remaining:
              type: integer
              description: How many calls consumer can do
            X-Rate-Limit-Reset:
              type: datetime
              description: When rate limit will be reset
              format: rfc3339
      (oas-tags):
        - Persons
    is:
      - userAgent
      - pageSize
types:
  Person:
    description: A person which can be the user itself or one of his friend
    properties:
      firstName:
        description: first name
        type: string
        example: John
        required: false
      lastName:
        description: last name
        type: string
        example: Doe
        required: false
      username:
        description: Username used to connect to the service
        type: string
        pattern: '[a-z0-9]{8,64}'
        minLength: 8
        maxLength: 64
        example: john1doe6
    (oas-schema-title): Human
  Error:
    description: Give full information about the problem
    properties:
      code:
        description: A human readable code (death to numeric error codes!)
        type: string
    (oas-schema-title): MultiLingualMultiDeviceError
traits:
  pageSize:
    queryParameters:
      pageSize:
        type: integer
        description: Number of persons returned
        format: int32
        required: true
  userAgent:
    headers:
      userAgent:
        type: string
        description: All API consumers MUST provide a user agent
        required: true
  userData:
    body:
      multipart/form-data:
        properties:
          userData:
            description: The person's data
            required: true
            type: string
        description: The person's data
  userBody:
    body:
      application/json:
        type: Person
        (oas-body-name): userBody
        description: The person body.
(oas-responses):
  Standard500ErrorResponse:
    body:
      type: Error
    description: An unexpected error occured.
    headers:
      X-Rate-Limit-Remaining:
        type: integer
        description: How many calls consumer can do
      X-Rate-Limit-Reset:
        type: datetime
        description: When rate limit will be reset
        format: rfc3339
  PersonDoesNotExistResponse:
    description: Person does not exist.
    headers:
      X-Rate-Limit-Remaining:
        type: integer
        description: How many calls consumer can do
      X-Rate-Limit-Reset:
        type: datetime
        description: When rate limit will be reset
        format: rfc3339
  TotallyUnexpectedResponse:
    description: A totally unexpected response
    headers:
      X-Rate-Limit-Remaining:
        type: integer
        description: How many calls consumer can do
      X-Rate-Limit-Reset:
        type: datetime
        description: When rate limit will be reset
        format: rfc3339
annotationTypes:
  oas-responses: any
  oas-tags:
    type: 'string[]'
    allowedTargets: Method
  oas-summary:
    type: string
    allowedTargets: Method
  oas-schema-title:
    type: string
    allowedTargets: TypeDeclaration
  oas-body-name:
    type: string
    allowedTargets: TypeDeclaration
  oas-responses-default: any
  oas-global-response-definition: any
</pre>

</td>
  </tr>
</table>

<a name="SecurityDefinitionsObject"></a>
### SecurityDefinitions

OAS security definitions are converted this way:

<table>
  <tr>
    <td><b>OAS 2.0 Security Definition</td>
    <td><b>RAML 1.0 Security Scheme</td>
  </tr>
  <tr>
    <td>apiKey</td>
    <td>Pass Through</td>
  </tr>
  <tr>
    <td>basic</td>
    <td>Basic Authentication</td>
  </tr>
  <tr>
    <td>oauth2</td>
    <td>Oauth2</td>
  </tr>
</table>

<a name="apikey"></a>
#### SecurityDefinitions : apiKey

<table>
  <tr>
    <td><b>OAS 2.0 Field Name. </td>
    <td><b>RAML 1.0 Field Name</td>
  </tr>
  <tr>
    <td>type = apiKey</td>
    <td>type = Pass Through</td>
  </tr>
  <tr>
    <td>description</td>
    <td>description</td>
  </tr>
  <tr>
    <td>in: header, query</td>
    <td>describedBy. headers, queryParameters</td>
  </tr>
  <tr>
    <td>name</td>
    <td>(header / queryParameter) name</td>
  </tr>
</table>


<table>
  <tr>
    <td><b>OAS 2.0 ApiKey SECURITY example</td>
    <td><b>RAML 1.0 Conversion</td>
  </tr>
  <tr>
    <td>
<pre>
Example 12
swagger: '2.0'
info:
  version: 1.0.0
  title: Security tryout
  description: #### Tries out different security
               configurations
paths:
  /getApiKey:
    get:
      parameters:
      - name: count
        in: query
        description: Count of media to return.
        type: integer
      - name: max_id
        in: query
        description: Return media earlier than this 
                     max_id.s
        type: integer
      - name: min_id
        in: query
        description: Return media later than this 
                     min_id.
        type: integer
      security:
      - internalApiKey: []
      responses:
        '200':
          description: InternalApiKey. Will send 
            `Authenticated` if authentication
            is succesful, otherwise it will send    
            `Unauthorized`
securityDefinitions:
    internalApiKey:
        type: apiKey
        in: header
        name: api_key
        description: Api Key Authentication
</pre>

    </td>
    <td>
<pre>
#%RAML 1.0
title: Security tryout
version: 1.0.0
description: configurations
securitySchemes:
  internalApiKey:
    type: Pass Through
    describedBy:
      headers:
        api_key:
          type: string
    description: Api Key Authentication
/getApiKey:
  displayName: getApiKey
  get:
    displayName: GET_getApiKey
    responses:
      '200':
        description: 'InternalApiKey. Will send 
           `Authenticated` if authentication is
            succesful, otherwise it will send
            `Unauthorized`'
    queryParameters:
      count:
        description: Count of media to return.
        type: integer
        displayName: Count of media to return.
      max_id:
        description: Return media earlier than 
                     this max_id.s
        type: integer
        displayName: Return media earlier than
                     this max_id.s
      min_id:
        description: Return media later than this min_id.
        type: integer
        displayName: Return media later than this min_id.
    securedBy:
      - internalApiKey
</pre>

</td>
  </tr>
</table>

<a name="basic"></a>
#### SecurityDefinitions : basic

<table>
  <tr>
    <td><b>OAS 2.0 Field Name. </td>
    <td><b>RAML 1.0 Field Name</td>
  </tr>
  <tr>
    <td>type = basic</td>
    <td>type = Basic Authentication</td>
  </tr>
  <tr>
    <td>description</td>
    <td>description</td>
  </tr>
</table>


<table>
  <tr>
    <td><b>OAS 2.0 Basic SECURITY example</td>
    <td><b>RAML 1.0 Conversion</td>
  </tr>
  <tr>
    <td>
<pre>
Example 13
swagger: '2.0'
info:
  version: 1.0.0
  title: Security tryout
  description: Tries out different security
               configurations
paths:
  /getBasicAuth:
    get:
      parameters:
      - name: count
        in: query
        description: Count of media to return.
        type: integer
      - name: max_id
        in: query
        description: Return media earlier than this
                      max_id.s
        type: integer
      - name: min_id
        in: query
        description: Return media later than this
                     min_id.
        type: integer
      security:
      - basicAuth: []
      responses:
        200:
          description: Basic Auth. Will send
              `Authenticated` if authentication is
              succesful, otherwise it will send
              `Unauthorized`
securityDefinitions:
  basicAuth:
   type: basic
   description: HTTP Basic Authentication. 
        Works over `HTTP` and `HTTPS`
</pre>
    </td>
    <td>
<pre>
#%RAML 1.0
title: Security tryout
version: 1.0.0
description: Tries out different security
              configurations
securitySchemes:
  basicAuth:
    type: Basic Authentication
    description: HTTP Basic Authentication. 
             Works over `HTTP` and `HTTPS`
/getBasicAuth:
  displayName: getBasicAuth
  get:
    displayName: GET_getBasicAuth
    responses:
      '200':
        description: 'Basic Auth. Will send 
              `Authenticated` if authentication is
               succesful, otherwise it will send
              `Unauthorized`'
    queryParameters:
      count:
        description: Count of media to return.
        type: integer
        displayName: Count of media to return.
      max_id:
        description: Return media earlier than this max_id.s
        type: integer
        displayName: Return media earlier than this max_id.s
      min_id:
        description: Return media later than this min_id.
        type: integer
        displayName: Return media later than this min_id.
    securedBy:
      - basicAuth
</pre>
    </td>
  </tr>
</table>

<a name="oauth2"></a>
#### SecurityDefinitions : oauth2

<table>
  <tr>
    <td><b>OAS 2.0 Field Name</td>
    <td><b>RAML 1.0 Field Name</td>
  </tr>
  <tr>
    <td>type</td>
    <td>type = OAuth 2.0</td>
  </tr>
  <tr>
    <td>description</td>
    <td>description</td>
  </tr>
  <tr>
    <td>flow. Valid values are:
     <ul>    
<li>implicit
<li>password 
<li>application
<li>accessCode</td>
     </ul>
    <td>authorizationGrants. Conversion is done this way:
      <ul>
<li>implicit → implicit
<li>password → password
<li>application → client_credentials
<li>accessCode → authorization_code
      <ul>
</td>
  </tr>
  <tr>
    <td>if flow= implicit / access_code<br>
authorizationUrl</td>
    <td>authorizationGrants = implicit / authorization_code<br>
authorizationUri</td>
  </tr>
  <tr>
    <td>if flow= password /application/ accessCode<br>
tokenUrl
    </td>
    <td>authorizationGrants=password / client_credentiasls / authorization_code <br>

accessTokenUrl</td>
  </tr>
  <tr>
    <td>scopes</td>
    <td>scopes</td>
  </tr>
</table>


<table>
  <tr>
    <td><br>OAS 2.0 oauth2 SECURITY example</td>
    <td><br>RAML 1.0 Conversion</td>
  </tr>
  <tr>
    <td>
<pre>
Example 14
swagger: '2.0'
info:
  version: 1.0.0
  title: Security tryout
  description: Tries out different security
               configurations
schemes:
- http
host: mazimi-prod.apigee.net
basePath: /security
paths:
  /getOauth2Auth:
    get:
      parameters:
      - name: count
        in: query
        description: Count of media to return.
        type: integer
      - name: max_id
        in: query
        description: Return media earlier than 
                     this max_id.s
        type: integer
      - name: min_id
        in: query
        description: Return media later than this 
                     min_id.
        type: integer
      security:
      - oauth2:
        - read:pets
      responses:
        '200':
          description: Oauth2 Authorization. Will send 
           `Authenticated` if authentication
            is successful, otherwise it will send 
           `Unauthorized`
securityDefinitions:
  oauth2:
    type: oauth2
    authorizationUrl: 
           http://swagger.io/api/oauth/dialog
    flow: implicit
    scopes:
      write:pets: modify pets in your account
      read:pets: read your pets
</pre>

</td>
    <td>
<pre>
#%RAML 1.0
title: Security tryout
version: 1.0.0
baseUri: 'http://mazimi-prod.apigee.net/security'
protocols:
  - HTTP
description: Tries out different security configurations
securitySchemes:
  oauth2:
    type: OAuth 2.0
    settings:
      authorizationUri: 'http://swagger.io/api/oauth/dialog'
      accessTokenUri: ''
      authorizationGrants:
        - implicit
      scopes:
        - 'write:pets'
        - 'read:pets'
/getOauth2Auth:
  displayName: getOauth2Auth
  get:
    displayName: GET_getOauth2Auth
    responses:
      '200':
        description: 'Oauth2 Authorization. Will send `Authenticated` if authentication is successful, otherwise it will send `Unauthorized`'
    queryParameters:
      count:
        description: Count of media to return.
        type: integer
        displayName: Count of media to return.
      max_id:
        description: Return media earlier than this max_id.s
        type: integer
        displayName: Return media earlier than this max_id.s
      min_id:
        description: Return media later than this min_id.
        type: integer
        displayName: Return media later than this min_id.
    securedBy:
      - oauth2:
          scopes:
            - 'read:pets'
</pre>
</td>
  </tr>
</table>

<a name="DataTypes"></a>
### Data Types

#### Primitives

<table>
  <tr>
    <td><b>Common Name</td>
    <td><b>OAS type</td>
    <td><b>OAS format</td>
    <td><b>Comments</td>
    <td><b>RAML</td>
  </tr>
  <tr>
    <td>integer</td>
    <td>integer</td>
    <td>int32</td>
    <td>signed 32 bits</td>
    <td>type=integer
format=int32</td>
  </tr>
  <tr>
    <td>long</td>
    <td>integer</td>
    <td>int64</td>
    <td>signed 64 bits</td>
    <td>type=integer
format=int64</td>
  </tr>
  <tr>
    <td>float</td>
    <td>number</td>
    <td>float</td>
    <td></td>
    <td>type=number
format=float</td>
  </tr>
  <tr>
    <td>double</td>
    <td>number</td>
    <td>double</td>
    <td></td>
    <td>type=number
format=double</td>
  </tr>
  <tr>
    <td>string</td>
    <td>string</td>
    <td></td>
    <td></td>
    <td>type=string</td>
  </tr>
  <tr>
    <td>byte</td>
    <td>string</td>
    <td>byte</td>
    <td>base64 encoded characters</td>
    <td>type=string
facet:
  format: byte</td>
  </tr>
  <tr>
    <td>binary</td>
    <td>string</td>
    <td>binary</td>
    <td>any sequence of octets</td>
    <td>type=string
facet:
  format: binary</td>
  </tr>
  <tr>
    <td>boolean</td>
    <td>boolean</td>
    <td></td>
    <td></td>
    <td>type=boolean</td>
  </tr>
  <tr>
    <td>date</td>
    <td>string</td>
    <td>date</td>
    <td>As defined by full-date - RFC3339</td>
    <td>type=date-only</td>
  </tr>
  <tr>
    <td>dateTime</td>
    <td>string</td>
    <td>date-time</td>
    <td>As defined by date-time - RFC3339</td>
    <td>type=datetime
format=rfc3339</td>
  </tr>
  <tr>
    <td>password</td>
    <td>string</td>
    <td>password</td>
    <td>Used to hint UIs the input needs to be obscured.</td>
    <td>type=string
facet:
  format: password</td>
  </tr>
</table>

<a name="Schemas"></a>
### Schemas

<table>
  <tr>
    <td><b>Use case</td>
    <td><b>OAS</td>
    <td><b>RAML</td>
  </tr>
  <tr>
    <td><b>Simple Model</td>
    <td>
<pre>
Example 20
swagger: "2.0"
info:
  version: 1.0.0
  title: Definition names conversion example
definitions:
    ResourceLink:
      description: a description
      type: object
      properties:
         href:
           type: string
         rel:
           type: string
           enum:
            - self
            - next
            - prev
    Image[Link]:
      type: object
      properties:
        href:
          type: string
        rel:
          type: string
          enum:
            - SmallImage
            - MediumImage
            - LargeImage
    LinkUsage:
      required:
         - name
      properties:
	     name:
	       type: string
	     usage:
	       $ref: "#/definitions/Image[Link]"
paths: {}
</pre>

</td>
    <td>required=true is the default
we must specify when property is not required.
<pre>
#%RAML 1.0
title: Definition names conversion example
version: 1.0.0
types:
  ResourceLink:
    description: a description
    type: object
    properties:
      href:
        type: string
        required: false
      rel:
        type: string
        enum:
          - self
          - next
          - prev
        required: false
  Image_Link_:
    type: object
    properties:
      href:
        type: string
        required: false
      rel:
        type: string
        enum:
          - SmallImage
          - MediumImage
          - LargeImage
        required: false
    (oas-definition-name): 'Image[Link]'
  LinkUsage:
    properties:
      name:
        type: string
      usage:
        type: Image_Link_
        required: false
annotationTypes:
  oas-definition-name:
    type: string
    allowedTargets: TypeDeclaration
</pre>

</td>
  </tr>
  <tr>
    <td><b>Model with Map / Dictionary Properties</td>
    <td>
<pre>    
Example 21
swagger: "2.0"
info:
 version: 1.0.0
 title: Definition names conversion example
definitions:
 User:
   type: object
   additionalProperties:
     type: string
   properties:
     id:
       type: integer
       format: int64
     username:
       type: string
     firstName:
       type: string
     lastName:
       type: string
     email:
       type: string
 Users:
   type: array
   items:
     type: object
     additionalProperties:
       type: string
paths: {}
</pre>
<pre> 
Example 22
swagger: "2.0"
info:
 version: 1.0.0
 title: Definition names conversion example
definitions:
 User:
   type: object
   properties:
     id:
       type: integer
       format: int64
     username:
       type: string
     firstName:
       type: string
     lastName:
       type: string
     email:
       type: string
paths:
 /test:
   post:
     responses:
       200:
         description: OK
     parameters:
       - name: username
         in: body
         required: true
         description: The person's username
         schema:
           $ref: '#/definitions/User'
           additionalProperties:
             type: string
</pre>
<pre>
Example 23
Defining additionalProperties as a type reference
swagger: "2.0"
info:
 version: 1.0.0
 title: Definition names conversion example
definitions:
 User:
   type: object
   additionalProperties:
     type: string
   properties:
     id:
       type: integer
       format: int64
     username:
       type: string
     firstName:
       type: string
     lastName:
       type: string
     email:
       type: string
 ExtendedUsers:
   type: object
   additionalProperties:
     $ref: "#/definitions/User"    
paths: {}
</pre>
    </td>
    <td>We can ignore additionalProperties facet since additionalProperties=true is the default value. But in this case, we should consider validate that all additional properties are strings
<pre>
#%RAML 1.0
title: Definition names conversion example
version: 1.0.0
types:
 User:
   properties:
     id:
       type: integer
       format: int64
       required: false
     username:
       type: string
       required: false
     firstName:
       type: string
       required: false
     lastName:
       type: string
       required: false
     email:
       type: string
       required: false
     //:
       type: string
 Users:
     type: array
     items:
       type: object
       properties:
         //:
           type: string
</pre>
<pre>
#%RAML 1.0
title: Definition names conversion example
version: 1.0.0
/test:
 displayName: test
 post:
   displayName: POST_test
   body:
     application/json:
       type: User
       properties:
         //: 
          type: string
       (oas-body-name): username
   responses:
     '200':
       description: OK
types:
 User:
   properties:
     id:
       type: integer
       format: int64
       required: false
     username:
       type: string
       required: false
     firstName:
       type: string
       required: false
     lastName:
       type: string
       required: false
     email:
       type: string
       required: false
annotationTypes:
 oas-body-name:
   type: string
   allowedTargets: TypeDeclaration
</pre>
<pre>
#%RAML 1.0
title: Definition names conversion example
version: 1.0.0
types:
 User:
   properties:
     id:
       type: integer
       format: int64
       required: false
     username:
       type: string
       required: false
     firstName:
       type: string
       required: false
     lastName:
       type: string
       required: false
     email:
       type: string
       required: false
     //:
       type: string
 ExtendedUsers:
   type: object
   properties:
     //:
       type: User
</pre>

</td>
  </tr>
  <tr>
    <td><b>Model with example</td>
    <td>
 <pre>
 Foo:
  type: object  properties:    id:      type: integer      format: int64    name:      type: string  required:    - name  example:    name: Puma    id: 1
</pre>
</td>
    <td>We have to use the example at operation level or everywhere the type is being referenced or examples are available
<pre>
types:
  Foo:
    type: object    properties:      id:        type: integer        format: int64
        required: false      name:        type: string      example:        name: Puma        id: 1
/foos:
  get:
    description: blablabla
    queryParameters:
      name?: string
      ownerName?: string
    responses:
      200:
        body:
          application/json:
            type: Foo[]
            example: |
              [
                {"id" : 1, 
                 "name": "Puma" }
              ]
  </pre>
</td>
  </tr>
  <tr>
    <td><b>Models with Composition</td>
    <td>
<pre>
Example 24
definitions:  ErrorModel:    type: object    required:    - message    - code    properties:      message:        type: string      code:        type: integer        minimum: 100        maximum: 600  ExtendedErrorModel:    allOf:    - $ref: '#/definitions/ErrorModel'    - type: object      required:      - rootCause      properties:        rootCause:          type: string
</pre>
</td>
    <td>
<pre>
types:
  ErrorModel:
    type: object    properties:      message:        type: string      code:
        type: integer        minimum: 100        maximum: 600  ExtendedErrorModel:    type: ErrorModel    properties:       rootCause:         type: string
</pre>
  </td>
  </tr>
  <tr>
    <td><b>Models with Polymorphism Support</td>
    <td>
<pre>
definitions:  Pet:    type: object    discriminator: petType    properties:      name:        type: string      petType:        type: string    required:    - name    - petType  Cat:    description: 
       A representation of a cat    allOf:    - $ref: '#/definitions/Pet'    - type: object      properties:        huntingSkill:          type: string          description: The measured ...          default: lazy          enum:          - clueless          - lazy          - adventurous          - aggressive      required:      - huntingSkill  Dog:    description: 
      A representation of a dog    allOf:    - $ref: '#/definitions/Pet'    - type: object      properties:        packSize:          type: integer          format: int32          description: the size of ...          default: 0          minimum: 0      required:      - packSize
</pre>
    </td>
    <td>
<pre>
types:
  Pet:
    type: object    discriminator: petType
    properties:      name:        type: string      petType:        type: string  Cat:    type: Pet    properties:       huntingSkill:          type: string
          default: lazy          enum:          [clueless,lazy,adventurous,            aggressive]
  Dog:    type: Pet    properties:       packSize:          type: integer          format: int32
          default: 0          minimum: 0
</pre>  
  
  </td>
          
  </tr>
</table>


**Regarding OAS types names:**

If OAS definition name contains characters that are not valid for RAML type names, the converter will replace those characters with an underscore ( _ ) and keep the original name as an annotation:
<pre>
annotationTypes:
	oas_original_definition_name:
		type: string
		allowedTargets: TypeDeclaration
</pre>
<table>
  <tr>
    <td><b>OAS 2.0 Definitions</td>
    <td><b>RAML 1.0 Conversion</td>
  </tr>
  <tr>
    <td>
<pre>
Example 19
swagger: "2.0"
info:
 version: 1.0.0
 title: Definition names conversion example
definitions:
   ResourceLink:
       description: a description
       type: object
       properties:
           href:
             type: string
           rel:
             type: string
             enum:
               - self
               - next
               - prev
   Image[Link]:
       type: object
       properties:
           href:
             type: string
           rel:
             type: string
             enum:
               - SmallImage
               - MediumImage
               - LargeImage
   Image[[link]]:
       type: object
       properties:
         success:
           type: boolean
paths: {}
</pre>
   
</td>
    <td>
<pre>#%RAML 1.0
title: Definition names conversion example
version: 1.0.0
types:
 ResourceLink:
   description: a description
   properties:
     href:
       type: string
       required: false
     rel:
       type: string
       enum:
         - self
         - next
         - prev
       required: false
 Image_Link_:
   properties:
     href:
       type: string
       required: false
     rel:
       type: string
       enum:
         - SmallImage
         - MediumImage
         - LargeImage
       required: false
   (oas-definition-name): 'Image[Link]'
 Image__link__:
   properties:
     success:
       type: boolean
       required: false
   (oas-definition-name): 'Image[[link]]'
annotationTypes:
 oas-definition-name:
   type: string
   allowedTargets: TypeDeclaration
</pre>
  </td>
  </tr>
</table>

<a name="ReferenceObject"></a>
### Handling references - Reference object

There are two ways of handling references, depending on the reference target:

* Reference to inner definitions/parameters/responses. A simple object to allow referencing other definitions in the specification. Used to reference parameters and responses that are defined at the top level or other files for reuse.

* Reference to external files. External references get dereferenced and all external definitions are merged into a single RAML specification file except external references to "definitions".

<table>
  <tr>
    <td><b>OAS 2.0 Definitions Ref </td>
    <td><b>RAML 1.0 Conversion</td>
  </tr>
  <tr>
    <td>Being Address a type definition within the same file
<pre>
{  "type": "object",  "required": [    "name"  ],  "properties": {    "name": {      "type": "string"    },    "address": {      "$ref": "#/definitions/Address"    },    "age": {      "type": "integer",      "format": "int32",      "minimum": 0    }  }}
</pre>
</td>
    <td>
<pre>
type: objectproperties:  name:    type: string  address:
    type: Address
    required: false  age:    type: integer    format: int32    minimum: 0
    required: false
</pre>
</td>
  </tr>
  <tr>
    <td>
Example 16
Being Address a type defined at Address.json file
<pre>
{  "type": "object",  "required": [    "name"  ],  "properties": {    "name": {      "type": "string"    },    "address": {      "$ref": "Address.json"    },    "age": {      "type": "integer",      "format": "int32",      "minimum": 0    }  }}
</pre>
</td>
    <td>
<pre>
type: objectproperties:  name:    type: string  address:
    type: !include Address.json
    required: false  age:    type: integer    format: int32    minimum: 0
    required: false
</pre>
</td>
  </tr>
  <tr>
    <td>Being Address a type defined at definitions.json file
<pre>
{  "type": "object",  "required": [    "name"  ],  "properties": {    "name": {      "type": "string"    },    "address": {      "$ref": "definitions.json#/Address"    },    "age": {      "type": "integer",      "format": "int32",      "minimum": 0    }  }}
</pre>
</td>
    <td>
<pre>
type: objectproperties:  name:    type: string  address:
    type: !include definition.json#Address
    required: false  age:    type: integer    format: int32    minimum: 0
    required: false
</pre>
</td>
  </tr>
</table>


<table>
  <tr>
    <td><b>OAS 2.0 Other external files Ref</td>
    <td><b>RAML 1.0 Conversion</td>
  </tr>
  <tr>
    <td>
Example 17
External definition for security
commons.yaml
<pre>
securityDefinitions:  OauthSecurity:    description: New Oauth security system. Do not use MediaSecurity or LegacySecurity.    type: oauth2    flow: accessCode    authorizationUrl: 'https://oauth.simple.api/authorization'    tokenUrl: 'https://oauth.simple.api/token'    scopes:      admin: Admin scope      user: User scope  MediaSecurity:    description: Specific media security for backward compatibility. Use OauthSecurity instead.    type: apiKey    in: query    name: media-api-key  LegacySecurity:    description: Legacy security system for backward compatibility. Use OauthSecurity instead.    type: basic
</pre>
<pre>
api.yaml
swagger: "2.0"
info:
  version: 1.0.0
  title: Images Sub-API
  description: images operations

securityDefinitions:
  $ref: commons.yaml#/securityDefinitions
</pre>
</td>
    <td>
<pre>#%RAML 1.0
title: Images Sub-API
version: 1.1.0
description: images operations
securitySchemes:
 OauthSecurity:
   type: OAuth 2.0
   settings:
     authorizationUri: 'https://oauth.simple.api/authorization'
     accessTokenUri: 'https://oauth.simple.api/token'
     authorizationGrants:
       - authorization_code
     scopes:
       - admin
       - user
 LegacySecurity:
   type: Basic Authentication
   description: Legacy security system for backward compatibility. Use OauthSecurity instead.
 MediaSecurity:
   type: Pass Through
   describedBy:
     queryParameters:
       media-api-key:
         type: string
   description: Specific media security for backward compatibility. Use OauthSecurity instead.
</pre>

</td>
  </tr>
  <tr>
    <td>
Example 18
External definition for parameters at commons.yaml
<pre>
parameters:  userAgent:    name: User-Agent    description: All API consumers MUST provide a user agent    type: string    in: header    required: true  pageSize:    name: pageSize    in: query    description: Number of items returned    type: integer    format: int32    minimum: 0    exclusiveMinimum: true    maximum: 100    exclusiveMaximum: false    multipleOf: 10    default: 20  pageNumber:    name: pageNumber    in: query    description: Page number    type: integer    default: 1
</pre>
<pre>
api.yaml
swagger: '2.0'info:  version: 1.1.0  title: Simple API  description: A simple API to learn how to write OpenAPI Specification.
.
.

paths:  /persons:    parameters:      - $ref: '#/parameters/userAgent'    get:      summary: Gets some persons      description: Returns a list containing all persons. The list supports paging.      parameters:        - $ref: '#/parameters/pageSize'        - $ref: '#/parameters/pageNumber'
</pre>
</td>
    <td>
<pre>#%RAML 1.0
title: Simple API
version: 1.1.0
description: A simple API to learn how to write OpenAPI Specification

traits:
 pageSize:
   queryParameters:
     pageSize:
       facets:
         exclusiveMinimum: boolean
         exclusiveMaximum: boolean
       type: integer
       description: Number of persons returned
       format: int32
       maximum: 100
       default: 20
       exclusiveMinimum: true
       exclusiveMaximum: false
 pageNumber:
   queryParameters:
     pageNumber:
       type: integer
       description: Page number
       default: 1
 userAgent:
   headers:
     User-Agent:
       type: string
       description: All API consumers MUST provide a user agent
       required: true

/persons:
  get:
    displayName: searchUsers
    (oas-summary): Gets some persons
    description: Returns a list containing all persons. The list supports paging.
    is:
      - pageSize
      - pageNumber
      - userAgent
</pre>
</td>
  </tr>
</table>

<a name="CustomExtensions"></a>
### **Handling custom extensions**

Custom extensions will be converted to annotations following this criteria:

* Create an annotation type for each "x-" with type "any". For example, for "x-extension-example"  an annotation type "oas-x-extension-example: any" will be created.

* This annotation will be used at the node where it is referenced, assigning the appropriate data properties into it. Possible values are object, array, primitives, or a simple null. The RAML type "any" should cover all types.

<table>
  <tr>
    <td><b>OAS 2.0 Custom Extensions</td>
    <td><b>RAML 1.0 Conversion</td>
  </tr>
  <tr>
    <td>
<pre>
Example 15
swagger: "2.0"
info:
 contact:
   email: support@bitbucket.org
   name: Bitbucket Support
   url: 'https://bitbucket.org/support'
 description: '.....'
 termsOfService: 'https://www.atlassian.com/legal/customer-agreement'
 title: Bitbucket
 version: '2.0'
 x-apisguru-categories:
   - developer_tools
 x-logo:
   url: 'https://example.com/img_homepage_bitbucket-logo-blue.svg'
 x-origin:
   format: swagger
   url: 'https://bitbucket.org/api/swagger.json'
   version: '2.0'
 x-preferred: true
 x-providerName: bitbucket.org
 x-tags:
   - code repository
   - code collaboration
   - git
paths: {}
</pre>
</td>
    <td>
<pre>#%RAML 1.0
title: Bitbucket
version: '2.0'
description: '.....'
(oas-info):
  (oas-x-apisguru-categories):
    - developer_tools
  (oas-x-logo):
    url: 'https://example.com/img_homepage_bitbucket-logo-blue.svg'
  (oas-x-origin):
    format: swagger
    url: 'https://bitbucket.org/api/swagger.json'
    version: '2.0'
  (oas-x-preferred): true
  (oas-x-providerName): bitbucket.org
  (oas-x-tags):
    - code repository
    - code collaboration
    - git
  contact:
    name: Bitbucket Support
    url: 'https://bitbucket.org/support'
    email: support@bitbucket.org
  termsOfService: 'https://www.atlassian.com/legal/customer-agreement'
annotationTypes:
  oas-x-apisguru-categories: any
  oas-x-logo: any
  oas-x-origin: any
  oas-x-preferred: any
  oas-x-providerName: any
  oas-x-tags: any
  oas-info:
    properties:
      termsOfService?: string
      contact?:
        properties:
          name?: string
          url?: string
          email?: string
      license?:
        properties:
          name?: string
          url?: string
    allowedTargets: API
</pre>

</td>
  </tr>
</table>

<a name="gaps"></a>
### RAML 1.0 Gaps

We identified the following gaps in converting OAS 2.0 to RAML 1.0. The converter will handle those gaps by defining annotations to not lose semantics specified in the  original OAS file.

<a name="StdAnnotations"></a>
#### Standard RAML annotations defined for OAS 2.0 conversion

This is a summary of the annotations we are creating when importing OAS files into RAML. They represent pieces of definitions that are not directly supported by the RAML 1.0 specification.
<pre>
AnnotationTypes:   oas-summary: string     allowedTargets: Method   oas-deprecated: boolean?     allowedTargets: Method   oas-tags:string[]     allowedTargets: Method   oas-schema-title: string     allowedTargets: Method
   oas-property-title: string
     allowedTargets: TypeDeclaration   oas-info:     allowedTargets: API     properties:       termsOfService?: string       contact?:         properties:           name?: string           url?: string           email?: string       license?:         properties:           name?: string           url?: string   oas-externalDocs:      properties:        description?: string        url: string
   oas-tags-definition: 
    type: array
    items: 
      properties: 
        name: string
        description?: string
        externalDocs?: 
           description?: string
           url: string
    oas_original_definition_name:
        type: string
        allowedTargets: TypeDeclaration
   oas-x-<custom-extension-name>: any
   oas-responses: any
     allowedTargets: API   oas-responses-default: any
     allowedTargets: Method   oas-global-response-definition: any
     allowedTargets: Method
   oas-exclusiveMaximum: boolean
   oas-exclusiveMinimum: boolean
   oas-allowEmptyValue: boolean
   oas-collectionFormat: 
     { type: string, enum: [ csv, ssv, tsv, pipes, multi ], default: csv }
   oas-readOnly: boolean
   oas-format: string
</pre>
   

