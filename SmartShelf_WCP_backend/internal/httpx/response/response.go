package response

import "github.com/gin-gonic/gin"

type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type Envelope struct {
	Data  any        `json:"data,omitempty"`
	Meta  any        `json:"meta,omitempty"`
	Error *ErrorBody `json:"error,omitempty"`
}

func Success(c *gin.Context, statusCode int, data any) {
	c.JSON(statusCode, Envelope{Data: data})
}

func SuccessWithMeta(c *gin.Context, statusCode int, data any, meta any) {
	c.JSON(statusCode, Envelope{Data: data, Meta: meta})
}

func Failure(c *gin.Context, statusCode int, code, message string) {
	c.JSON(statusCode, Envelope{
		Error: &ErrorBody{
			Code:    code,
			Message: message,
		},
	})
}
