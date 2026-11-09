const names=['cs234','bonn','manipulation','nav2','moveit','cs224r','underactuated','cs231n','arduino','lerobot'];
module.exports=names.map(name=>require('../config/extension_'+name+'.json'));
