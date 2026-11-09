# 逐格教学插件接口

每门课独立维护 `web/course-inspectors/<courseId>.js`，Node 导出同一对象，浏览器注册到 `globalThis.CourseInspectorProviders[courseId]`。不要引入运行时依赖。

```js
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
 return {courseId:'...',models:{
   'model-id':{
     intuition:'本模型具体解释什么',
     inspect(trace,index){
       // AI/foundation: trace.steps[index].variables; robotics: trace.frames[index].vars
       return {title:'当前计算/状态',summary:'与当前实际帧的关系',cells:[
         {id:'stable-id',label:'一个结果/判断',value:123,
          formula:'代入实际数值的算式或具体状态转换',inputs:{a:1,b:2},note:'单位、假设或边界'}
       ]};
     },
     experiments:[{id:'...',label:'仅改变什么',prediction:'先预测哪些结果改变/保持',before:{},after:{},
       expectation:'预期结果及原因',
       verify(beforeTrace,afterTrace){return true;}}]
   }
 }};
});
```

每模型至少一个实际参数实验（确实无控制量的确定性模型可显式说明并用独立固定案例检查，不虚构控件）；至少一个具体可复算格子/状态判断。优先展开数组/矩阵的各格、逐项和、状态变化，避免通用变量转储。`inspect` 必须对全部帧、默认和边界参数安全；不得修改 trace。读取完整 result 时，清楚标为“最终核对”或“完整案例”，不能将未来值说成当前已算结果。所有数值来自同一个实际 trace；展示四位小数，验证使用完整精度。verify 必须检查具体预期而非恒 true。

测试加载原有模型并对每个实际 demos 检查 inspect 全帧、实际 experiments 前后参数与 verify、不可变性。机械课程模型接口由控制量默认值合并 before/after 后 model.run 调用；其结果为 frames 而非 steps。

保持各课程/讲次 ID、数据和草稿不变。静态数值/几何只提供单步检查，不加伪造动态；真实迭代继续使用真实轨迹。每门课 agent 只编辑自己的插件、测试、`docs/course-inspectors/<id>.json` 清单（课程、模型、验证数量、范围与限制）。根 agent 负责共享 UI、构建、合并与浏览器验收。
